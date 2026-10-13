import { Injectable, effect, untracked } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';

export interface RealtimeEvent {
  v: 1;
  topic: string;
  type: string;
  id: string;
  at: number;
  collectionId?: string;
  data?: {
    givenName?: string;
    familyName?: string;
    email?: string;
    mobilePhone?: string;
    createdAt?: string;
  };
}

const BACKOFF_MIN_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const PING_INTERVAL_MS = 5 * 60_000;
// API Gateway closes connections at 2 h; replace ours before that.
const MAX_CONNECTION_AGE_MS = 110 * 60_000;
const TOKEN_MARGIN_MS = 60_000;
const IDLE_CLOSE_MS = 30_000;
const CONFIRM_TIMEOUT_MS = 5000;
const MAX_FAILED_CONNECTS = 5;

type TimerName = 'reconnectTimer' | 'replaceTimer' | 'confirmTimer' | 'idleTimer';

interface TopicEntry {
  subject: Subject<RealtimeEvent>;
  count: number;
}

function isRealtimeEvent(msg: any): msg is RealtimeEvent {
  return msg?.v === 1
    && typeof msg.topic === 'string'
    && typeof msg.type === 'string'
    && typeof msg.id === 'string'
    && (msg.data === undefined || (typeof msg.data === 'object' && msg.data !== null));
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * One WebSocket to the admin realtime API, open only while logged in and at least
 * one topic has subscribers.
 */
@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  /** Emits when the connection is back after an unplanned drop; events in the gap were missed. */
  readonly reconnected$ = new Subject<void>();

  private loggedIn = false;
  private broken = false;
  private socket: WebSocket | null = null;
  private socketOpen = false;
  // The main socket's subscriptions were confirmed by the server.
  private confirmed = false;
  private replacement: WebSocket | null = null;
  private pending: WebSocket | null = null;
  private awaitingSubscribed = new Set<string>();
  private connectionLost = false;
  private replaceWhenTokenRefreshes = false;
  private attempt = 0;
  private replaceAttempt = 0;
  private failedConnects = 0;
  private expiryWarned = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private replaceTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private topics = new Map<string, TopicEntry>();

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    effect(() => {
      const loggedIn = !!this.authService.session()?.tokens;
      untracked(() => this.onSessionChange(loggedIn));
    });
  }

  /** Delivery is at-least-once: the same event can arrive twice, e.g. while a connection is replaced. */
  topic$(name: string): Observable<RealtimeEvent> {
    return new Observable<RealtimeEvent>((subscriber) => {
      let entry = this.topics.get(name);
      if (!entry) {
        entry = { subject: new Subject<RealtimeEvent>(), count: 0 };
        this.topics.set(name, entry);
        this.clearTimer('idleTimer');
        this.send({ action: 'subscribe', topic: name });
        if (this.replacement && this.replacement === this.pending) {
          this.replacement.send(JSON.stringify({ action: 'subscribe', topic: name }));
        }
        this.ensureConnected();
      }
      entry.count++;
      const subscription = entry.subject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        entry.count--;
        if (entry.count > 0) {
          return;
        }
        this.topics.delete(name);
        // Closing the socket drops the server-side subscription; an explicit unsubscribe
        // could be processed after a quick re-subscribe and silently undo it.
        if (this.topics.size > 0) {
          this.send({ action: 'unsubscribe', topic: name });
        } else {
          this.idleTimer = setTimeout(() => this.disconnect(), IDLE_CLOSE_MS);
        }
      };
    });
  }

  private onSessionChange(loggedIn: boolean) {
    this.loggedIn = loggedIn;
    if (!loggedIn) {
      this.disconnect();
      return;
    }
    this.failedConnects = 0;
    if (this.replaceWhenTokenRefreshes) {
      this.replaceConnection();
    }
    this.ensureConnected();
  }

  private ensureConnected() {
    if (!this.socket && !this.reconnectTimer) {
      this.connect();
    }
  }

  private connect() {
    this.reconnectTimer = null;
    // No usable token: wait, the session signal changes when AuthService refreshes it.
    if (!this.loggedIn || this.topics.size === 0 || !this.hasUsableToken()) {
      return;
    }
    this.socket = this.createSocket();
  }

  private disconnect() {
    (['reconnectTimer', 'replaceTimer', 'confirmTimer', 'idleTimer'] as const).forEach((t) => this.clearTimer(t));
    this.stopPing();
    this.discard(this.replacement);
    this.discard(this.socket);
    this.replacement = null;
    this.pending = null;
    this.socket = null;
    this.socketOpen = false;
    this.confirmed = false;
    this.attempt = 0;
    this.replaceAttempt = 0;
    this.connectionLost = false;
    this.replaceWhenTokenRefreshes = false;
  }

  private createSocket(): WebSocket | null {
    const configured = this.configService.config?.['WEBSOCKET_URL'];
    const token = this.authService.jwtToken;
    if (this.broken || !configured || !token) {
      return null;
    }
    const url = parseUrl(configured);
    if (url?.protocol !== 'wss:') {
      this.broken = true;
      this.logger.error('Realtime disabled, WEBSOCKET_URL is not a wss: URL');
      return null;
    }
    url.searchParams.set('token', token);
    let socket: WebSocket;
    try {
      socket = new WebSocket(url.toString());
    } catch (error) {
      this.broken = true;
      // The message can echo the URL, token included.
      this.logger.error(`Realtime disabled, WebSocket failed: ${(error as Error)?.name}`);
      return null;
    }
    socket.onopen = () => this.onOpen(socket);
    socket.onmessage = (event: MessageEvent) => this.onMessage(socket, event);
    socket.onclose = () => this.onClose(socket);
    socket.onerror = () => this.logger.warn('Realtime connection error');
    return socket;
  }

  // A socket counts as up only once the server confirms its subscriptions; a throttled subscribe gets no reply.
  private onOpen(socket: WebSocket) {
    for (const topic of this.topics.keys()) {
      socket.send(JSON.stringify({ action: 'subscribe', topic }));
    }
    if (socket === this.socket) {
      this.socketOpen = true;
    }
    this.pending = socket;
    this.awaitingSubscribed = new Set(this.topics.keys());
    if (this.awaitingSubscribed.size === 0) {
      this.onConfirmed(socket);
      return;
    }
    this.confirmTimer = setTimeout(() => this.onUnconfirmed(socket), CONFIRM_TIMEOUT_MS);
  }

  private onConfirmed(socket: WebSocket) {
    this.clearTimer('confirmTimer');
    this.pending = null;
    if (socket === this.replacement) {
      // The old socket was kept until now.
      this.swap();
      return;
    }
    this.attempt = 0;
    this.failedConnects = 0;
    this.expiryWarned = false;
    this.confirmed = true;
    this.startPing();
    this.scheduleReplace();
    if (this.connectionLost) {
      this.connectionLost = false;
      this.reconnected$.next();
    }
  }

  private onUnconfirmed(socket: WebSocket) {
    if (socket === this.replacement) {
      this.abandonReplacement();
      return;
    }
    this.discard(socket);
    this.onClose(socket);
  }

  private onMessage(socket: WebSocket, event: MessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg?.type === 'error') {
      this.logger.warn(`Realtime error: ${msg.code}`);
      return;
    }
    if (msg?.type === 'subscribed') {
      if (socket === this.pending) {
        this.awaitingSubscribed.delete(msg.topic);
        if (this.awaitingSubscribed.size === 0) {
          this.onConfirmed(socket);
        }
      }
      return;
    }
    if (isRealtimeEvent(msg)) {
      this.topics.get(msg.topic)?.subject.next(msg);
    }
  }

  private onClose(socket: WebSocket) {
    if (socket === this.replacement) {
      this.abandonReplacement();
      return;
    }
    if (socket !== this.socket) {
      return;
    }
    const wasUp = this.confirmed;
    this.stopPing();
    this.clearTimer('replaceTimer');
    this.clearTimer('confirmTimer');
    this.discard(this.replacement);
    this.replacement = null;
    this.pending = null;
    this.socket = null;
    this.socketOpen = false;
    this.confirmed = false;
    this.replaceWhenTokenRefreshes = false;
    this.connectionLost ||= wasUp;
    // The browser hides why a handshake failed, so a refusal looks like an outage; stop until the session changes.
    if (!wasUp && ++this.failedConnects >= MAX_FAILED_CONNECTS) {
      this.logger.warn(`Realtime stopped after ${MAX_FAILED_CONNECTS} failed connects; retrying on the next session refresh`);
      return;
    }
    if (this.loggedIn && this.topics.size > 0) {
      this.reconnectTimer = setTimeout(() => this.connect(), this.nextBackoff('attempt'));
    }
  }

  // Replace the connection before the token or the 2 h limit ends it, opening the new one first.
  private replaceConnection() {
    this.replaceTimer = null;
    if (!this.confirmed || this.replacement || this.topics.size === 0) {
      return;
    }
    this.replaceWhenTokenRefreshes = !this.hasUsableToken();
    if (!this.replaceWhenTokenRefreshes) {
      this.replacement = this.createSocket();
    }
  }

  // Keep the working socket and try the replacement again later.
  private abandonReplacement() {
    this.clearTimer('confirmTimer');
    this.pending = null;
    this.discard(this.replacement);
    this.replacement = null;
    this.replaceTimer = setTimeout(() => this.replaceConnection(), this.nextBackoff('replaceAttempt'));
  }

  private swap() {
    this.replaceAttempt = 0;
    this.expiryWarned = false;
    this.discard(this.socket);
    this.socket = this.replacement;
    this.replacement = null;
    this.startPing();
    this.scheduleReplace();
  }

  private scheduleReplace() {
    this.clearTimer('replaceTimer');
    const exp = this.tokenExpiryMs();
    const untilExpiry = exp === null ? Infinity : exp - Date.now() - TOKEN_MARGIN_MS;
    const delay = Math.max(0, Math.min(MAX_CONNECTION_AGE_MS, untilExpiry));
    this.replaceTimer = setTimeout(() => this.replaceConnection(), delay);
  }

  private nextBackoff(counter: 'attempt' | 'replaceAttempt') {
    const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** this[counter]);
    this[counter]++;
    return Math.max(BACKOFF_MIN_MS, cap / 2 + Math.random() * (cap / 2));
  }

  private tokenExpiryMs(): number | null {
    const exp = this.authService.session()?.tokens?.accessToken?.payload?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  }

  private hasUsableToken() {
    if (!this.authService.jwtToken) {
      return false;
    }
    const exp = this.tokenExpiryMs();
    if (exp === null || exp - Date.now() > TOKEN_MARGIN_MS) {
      return true;
    }
    // A client clock running fast makes every token look expired; say so once.
    if (!this.expiryWarned) {
      this.expiryWarned = true;
      this.logger.warn(`Realtime waiting for a token refresh: access token expires in ${Math.round((exp - Date.now()) / 1000)} s by this clock`);
    }
    return false;
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ action: 'ping' }), PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimer(name: TimerName) {
    if (this[name]) {
      clearTimeout(this[name]);
      this[name] = null;
    }
  }

  private discard(socket: WebSocket | null) {
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
  }

  private send(message: Record<string, string>) {
    if (this.socket && this.socketOpen) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
