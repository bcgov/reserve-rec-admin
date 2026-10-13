import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { RealtimeEvent, RealtimeService } from './realtime.service';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static throwOnCreate: Error | null = null;
  onopen: ((e?: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  onclose: ((e?: any) => void) | null = null;
  onerror: ((e?: any) => void) | null = null;
  sent: any[] = [];
  closed = false;

  constructor(public url: string) {
    if (MockWebSocket.throwOnCreate) {
      throw MockWebSocket.throwOnCreate;
    }
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
  }

  serverOpen() {
    this.onopen?.();
  }

  // Opens and confirms every subscription sent so far, as a server that accepts them would.
  serverAccept() {
    this.serverOpen();
    this.sent.filter((m) => m.action === 'subscribe')
      .forEach((m) => this.serverMessage({ type: 'subscribed', topic: m.topic }));
  }

  serverClose() {
    this.onclose?.();
  }

  serverMessage(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
}

const NOW = new Date('2026-10-09T12:00:00Z').getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('RealtimeService', () => {
  let config: any;
  let session: ReturnType<typeof signal<any>>;
  let logger: { warn: jest.Mock; error: jest.Mock; info: jest.Mock };
  let service: RealtimeService;
  let subscriptions: Subscription;
  const originalWebSocket = (global as any).WebSocket;

  const sockets = () => MockWebSocket.instances;
  const latest = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

  function login(token: string, expMs = Date.now() + 60 * MINUTE) {
    session.set({ tokens: { accessToken: { toString: () => token, payload: { exp: expMs / 1000 } } } });
    TestBed.tick();
  }

  function logout() {
    session.set(null);
    TestBed.tick();
  }

  function watch(topic = 'customers', received: RealtimeEvent[] = []) {
    const subscription = service.topic$(topic).subscribe((e) => received.push(e));
    subscriptions.add(subscription);
    return subscription;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    MockWebSocket.instances = [];
    MockWebSocket.throwOnCreate = null;
    (global as any).WebSocket = MockWebSocket;
    config = { WEBSOCKET_URL: 'wss://rt.example/ws' };
    session = signal<any>(null);
    logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };
    subscriptions = new Subscription();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session,
            get jwtToken() {
              return session()?.tokens?.accessToken?.toString() || null;
            },
          },
        },
        { provide: ConfigService, useValue: { get config() { return config; } } },
        { provide: LoggerService, useValue: logger },
      ],
    });
    service = TestBed.inject(RealtimeService);
    TestBed.tick();
  });

  afterEach(() => {
    subscriptions.unsubscribe();
    logout();
    jest.restoreAllMocks();
    jest.useRealTimers();
    (global as any).WebSocket = originalWebSocket;
  });

  describe('connecting', () => {
    it('does not connect while logged out', () => {
      watch();

      expect(sockets()).toHaveLength(0);
    });

    it('does not connect while no topic is wanted', () => {
      login('abc');

      expect(sockets()).toHaveLength(0);
    });

    it('connects with the url-encoded access token once logged in with a topic', () => {
      watch();
      login('abc=+/');

      expect(sockets()).toHaveLength(1);
      expect(latest().url).toBe('wss://rt.example/ws?token=abc%3D%2B%2F');
    });

    it('does nothing when WEBSOCKET_URL is not configured', () => {
      config = {};
      watch();
      login('abc');

      expect(sockets()).toHaveLength(0);
    });

    it('does not open a second socket when the session refreshes', () => {
      watch();
      login('abc');
      login('def');

      expect(sockets()).toHaveLength(1);
    });

    it('logs only the error name, once, when the WebSocket cannot be created, and stays off', () => {
      MockWebSocket.throwOnCreate = new SyntaxError('cannot open wss://rt.example/ws?token=secret-token');
      watch();
      login('secret-token');
      login('def');
      jest.advanceTimersByTime(10 * MINUTE);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls[0][0]).toContain('SyntaxError');
      expect(logger.error.mock.calls[0][0]).not.toContain('secret-token');
      expect(sockets()).toHaveLength(0);
    });

    it.each(['ws://rt.example/ws', 'https://rt.example/ws', 'not a url'])(
      'refuses a WEBSOCKET_URL of %s, logs once, and stays off',
      (url) => {
        config = { WEBSOCKET_URL: url };
        watch();
        login('abc');
        login('def');
        jest.advanceTimersByTime(10 * MINUTE);

        expect(sockets()).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error.mock.calls[0][0]).toContain('wss:');
      },
    );

    it('keeps a query string already on WEBSOCKET_URL', () => {
      config = { WEBSOCKET_URL: 'wss://rt.example/ws?stage=a' };
      watch();
      login('abc');

      expect(latest().url).toBe('wss://rt.example/ws?stage=a&token=abc');
    });

    it('logs once while the token looks too close to expiry to connect', () => {
      watch();
      login('stale', NOW + 30 * SECOND);
      login('stale2', NOW + 45 * SECOND);
      login('stale3', NOW + 50 * SECOND);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn.mock.calls[0][0]).toContain('expires in 30 s');
    });

    it('waits for a refreshed token instead of connecting with one about to expire', () => {
      watch();
      login('stale', NOW + 30 * SECOND);
      jest.advanceTimersByTime(10 * MINUTE);
      expect(sockets()).toHaveLength(0);

      login('fresh', Date.now() + 60 * MINUTE);

      expect(sockets()).toHaveLength(1);
      expect(latest().url).toBe('wss://rt.example/ws?token=fresh');
    });
  });

  describe('closing when idle', () => {
    it('closes the socket 30 seconds after the last subscriber leaves', () => {
      const subscription = watch();
      login('abc');
      latest().serverAccept();

      subscription.unsubscribe();
      jest.advanceTimersByTime(30 * SECOND - 1);
      expect(latest().closed).toBe(false);
      jest.advanceTimersByTime(1);

      expect(latest().closed).toBe(true);
      expect(latest().sent).toEqual([{ action: 'subscribe', topic: 'customers' }]);
    });

    it('keeps the socket when a subscriber returns within the grace period', () => {
      const subscription = watch();
      login('abc');
      latest().serverAccept();

      subscription.unsubscribe();
      jest.advanceTimersByTime(10 * SECOND);
      watch();
      jest.advanceTimersByTime(60 * SECOND);

      expect(sockets()).toHaveLength(1);
      expect(latest().closed).toBe(false);
      expect(latest().sent).toEqual([
        { action: 'subscribe', topic: 'customers' },
        { action: 'subscribe', topic: 'customers' },
      ]);
    });

    it('opens a new socket when a topic is wanted again after an idle close', () => {
      const subscription = watch();
      login('abc');
      latest().serverAccept();
      subscription.unsubscribe();
      jest.advanceTimersByTime(30 * SECOND);

      watch();

      expect(sockets()).toHaveLength(2);
    });
  });

  describe('reconnecting', () => {
    beforeEach(() => watch());

    it('reads a fresh token for each reconnect', () => {
      login('first');
      latest().serverAccept();
      login('second');

      latest().serverClose();
      jest.advanceTimersByTime(1000);

      expect(sockets()).toHaveLength(2);
      expect(latest().url).toBe('wss://rt.example/ws?token=second');
    });

    it('backs off exponentially up to 30 seconds while the server keeps refusing', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('abc', NOW + 10 * 60 * MINUTE);
      const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

      for (const delay of expectedDelays) {
        const before = sockets().length;
        latest().serverClose();
        // A session refresh between refusals keeps the give-up below out of this test.
        login('abc', NOW + 10 * 60 * MINUTE);
        jest.advanceTimersByTime(delay - 1);
        expect(sockets()).toHaveLength(before);
        jest.advanceTimersByTime(1);
        expect(sockets()).toHaveLength(before + 1);
      }
    });

    it('stops after 5 refused handshakes and resumes on the next session change', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('abc', NOW + 10 * 60 * MINUTE);
      for (const delay of [1000, 2000, 4000, 8000]) {
        latest().serverClose();
        jest.advanceTimersByTime(delay);
      }
      expect(sockets()).toHaveLength(5);

      latest().serverClose();
      jest.advanceTimersByTime(60 * MINUTE);
      expect(sockets()).toHaveLength(5);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stopped after 5 failed connects'));

      login('def', Date.now() + 60 * MINUTE);
      expect(sockets()).toHaveLength(6);
      expect(latest().url).toBe('wss://rt.example/ws?token=def');
    });

    it('closes the socket and backs off when the server never confirms the subscription', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      let reconnects = 0;
      subscriptions.add(service.reconnected$.subscribe(() => reconnects++));
      login('abc', NOW + 10 * 60 * MINUTE);
      const first = latest();
      first.serverOpen();

      jest.advanceTimersByTime(5 * SECOND - 1);
      expect(first.closed).toBe(false);
      jest.advanceTimersByTime(1);
      expect(first.closed).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(sockets()).toHaveLength(2);
      latest().serverOpen();
      jest.advanceTimersByTime(5 * SECOND + 2000 - 1);
      expect(sockets()).toHaveLength(2);
      jest.advanceTimersByTime(1);
      expect(sockets()).toHaveLength(3);
      expect(reconnects).toBe(0);
    });

    it('jitters the delay below the cap but never under 1 second', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      login('abc');
      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverClose();

      jest.advanceTimersByTime(1999);
      expect(sockets()).toHaveLength(3);
      jest.advanceTimersByTime(1);
      expect(sockets()).toHaveLength(4);
    });

    it('resets the backoff after a successful open', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('abc');
      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverClose();
      jest.advanceTimersByTime(2000);
      latest().serverAccept();

      latest().serverClose();
      jest.advanceTimersByTime(1000);

      expect(sockets()).toHaveLength(4);
    });

    it('stops retrying once the token is near expiry and resumes after the refresh', () => {
      login('abc', NOW + 90 * SECOND);
      latest().serverAccept();
      jest.advanceTimersByTime(31 * SECOND);
      latest().serverClose();

      jest.advanceTimersByTime(60 * MINUTE);
      expect(sockets()).toHaveLength(1);

      login('fresh', Date.now() + 60 * MINUTE);
      expect(sockets()).toHaveLength(2);
    });

    it('announces a reconnect after a dropped connection, not on the first open', () => {
      let reconnects = 0;
      subscriptions.add(service.reconnected$.subscribe(() => reconnects++));
      login('abc');
      latest().serverAccept();
      expect(reconnects).toBe(0);

      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverAccept();

      expect(reconnects).toBe(1);
    });
  });

  describe('replacing the connection', () => {
    beforeEach(() => watch());

    it('opens a socket with the refreshed token a minute before expiry, and closes the old one only once subscribed', () => {
      const received: RealtimeEvent[] = [];
      watch('customers', received);
      login('old', NOW + 10 * MINUTE);
      const old = latest();
      old.serverAccept();
      login('new', NOW + 70 * MINUTE);

      jest.advanceTimersByTime(9 * MINUTE - 1);
      expect(sockets()).toHaveLength(1);
      jest.advanceTimersByTime(1);
      expect(sockets()).toHaveLength(2);
      const next = latest();
      expect(next.url).toBe('wss://rt.example/ws?token=new');

      next.serverOpen();
      expect(next.sent).toEqual([{ action: 'subscribe', topic: 'customers' }]);
      expect(old.closed).toBe(false);
      old.serverMessage({ v: 1, topic: 'customers', type: 'created', id: 'during-overlap', at: 1, data: {} });
      expect(received.map((e) => e.id)).toEqual(['during-overlap']);

      next.serverMessage({ type: 'subscribed', topic: 'customers' });
      expect(old.closed).toBe(true);
      expect(next.closed).toBe(false);
    });

    it('keeps the old socket and retries when the replacement is never confirmed', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('old', NOW + 10 * MINUTE);
      const old = latest();
      old.serverAccept();
      login('new', NOW + 70 * MINUTE);
      jest.advanceTimersByTime(9 * MINUTE);
      const unconfirmed = latest();
      unconfirmed.serverOpen();

      jest.advanceTimersByTime(5 * SECOND);
      expect(old.closed).toBe(false);
      expect(unconfirmed.closed).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(sockets()).toHaveLength(3);
      latest().serverAccept();
      latest().serverMessage({ type: 'subscribed', topic: 'customers' });
      expect(old.closed).toBe(true);
    });

    it('backs off replacements without delaying the reconnect of the main socket', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('abc', NOW + 5 * 60 * MINUTE);
      const main = latest();
      main.serverAccept();
      jest.advanceTimersByTime(110 * MINUTE);
      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverClose();
      jest.advanceTimersByTime(2000);
      expect(sockets()).toHaveLength(4);

      main.serverClose();
      jest.advanceTimersByTime(1000);

      expect(sockets()).toHaveLength(5);
    });

    it('keeps the old socket and waits for the token refresh when the token was not refreshed', () => {
      login('old', NOW + 10 * MINUTE);
      const old = latest();
      old.serverAccept();

      jest.advanceTimersByTime(9 * MINUTE + 30 * SECOND);
      expect(sockets()).toHaveLength(1);
      expect(old.closed).toBe(false);

      login('new', Date.now() + 60 * MINUTE);
      expect(sockets()).toHaveLength(2);
      expect(latest().url).toBe('wss://rt.example/ws?token=new');
    });

    it('sends a topic subscribed during the overlap to both sockets', () => {
      login('old', NOW + 10 * MINUTE);
      const old = latest();
      old.serverAccept();
      login('new', NOW + 70 * MINUTE);
      jest.advanceTimersByTime(9 * MINUTE);
      const next = latest();
      watch('early');
      expect(next.sent).toEqual([]);

      next.serverOpen();
      watch('late');

      expect(next.sent).toEqual([
        { action: 'subscribe', topic: 'customers' },
        { action: 'subscribe', topic: 'early' },
        { action: 'subscribe', topic: 'late' },
      ]);
      expect(old.sent.filter((m) => m.action === 'subscribe')).toEqual([
        { action: 'subscribe', topic: 'customers' },
        { action: 'subscribe', topic: 'early' },
        { action: 'subscribe', topic: 'late' },
      ]);
    });

    it('does not open a replacement while closing for idleness', () => {
      login('abc', NOW + 5 * 60 * MINUTE);
      latest().serverAccept();
      jest.advanceTimersByTime(110 * MINUTE - 10 * SECOND);
      subscriptions.unsubscribe();

      jest.advanceTimersByTime(20 * SECOND);

      expect(sockets()).toHaveLength(1);
    });

    it('replaces the connection after 110 minutes when the token outlives that', () => {
      login('abc', NOW + 5 * 60 * MINUTE);
      latest().serverAccept();

      jest.advanceTimersByTime(110 * MINUTE - 1);
      expect(sockets()).toHaveLength(1);
      jest.advanceTimersByTime(1);

      expect(sockets()).toHaveLength(2);
    });

    it('keeps the old socket and retries when the replacement is refused', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);
      login('abc', NOW + 5 * 60 * MINUTE);
      const old = latest();
      old.serverAccept();
      jest.advanceTimersByTime(110 * MINUTE);

      latest().serverClose();
      expect(old.closed).toBe(false);
      jest.advanceTimersByTime(1000);

      expect(sockets()).toHaveLength(3);
    });
  });

  describe('topics', () => {
    it('subscribes once for several subscribers', () => {
      watch();
      login('abc');
      latest().serverAccept();

      watch();

      expect(latest().sent).toEqual([{ action: 'subscribe', topic: 'customers' }]);
    });

    it('unsubscribes a topic that leaves while another topic stays', () => {
      watch('other');
      login('abc');
      latest().serverAccept();
      const customers = watch('customers');

      customers.unsubscribe();

      expect(latest().sent).toEqual([
        { action: 'subscribe', topic: 'other' },
        { action: 'subscribe', topic: 'customers' },
        { action: 'unsubscribe', topic: 'customers' },
      ]);
    });

    it('sends remembered topics once the socket opens and again after every reconnect', () => {
      watch();
      login('abc');
      expect(latest().sent).toEqual([]);

      latest().serverAccept();
      expect(latest().sent).toEqual([{ action: 'subscribe', topic: 'customers' }]);

      latest().serverClose();
      jest.advanceTimersByTime(1000);
      latest().serverAccept();

      expect(sockets()).toHaveLength(2);
      expect(latest().sent).toEqual([{ action: 'subscribe', topic: 'customers' }]);
    });

    it('delivers envelopes to the matching topic and ignores malformed or control frames', () => {
      const received: RealtimeEvent[] = [];
      watch('customers', received);
      login('abc');
      latest().serverAccept();
      const envelope = {
        v: 1, topic: 'customers', type: 'created', id: 'sub-1', at: NOW,
        data: {
          givenName: 'Ada', familyName: 'Lovelace', email: 'ada@example.com',
          mobilePhone: '2505550100', createdAt: '2026-10-09T12:00:00.000Z',
        },
      };

      latest().serverMessage('not json');
      latest().serverMessage({ type: 'pong' });
      latest().serverMessage({ type: 'subscribed', topic: 'customers' });
      latest().serverMessage({ ...envelope, data: 'text' });
      latest().serverMessage({ ...envelope, topic: 'other' });
      latest().serverMessage(envelope);
      const { data: _data, ...dataless } = envelope;
      latest().serverMessage(dataless);

      expect(received).toEqual([envelope, dataless]);
    });

    it('logs an error frame and delivers nothing', () => {
      const received: RealtimeEvent[] = [];
      watch('customers', received);
      login('abc');
      latest().serverAccept();

      latest().serverMessage({ type: 'error', code: 'forbidden' });

      expect(received).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Realtime error: forbidden');
    });
  });

  describe('ping', () => {
    it('pings every 5 minutes while open and stops once closed', () => {
      watch();
      login('abc', NOW + 10 * 60 * MINUTE);
      latest().serverAccept();
      const socket = latest();
      socket.sent = [];

      jest.advanceTimersByTime(5 * MINUTE - 1);
      expect(socket.sent).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(socket.sent).toEqual([{ action: 'ping' }]);
      jest.advanceTimersByTime(5 * MINUTE);
      expect(socket.sent).toEqual([{ action: 'ping' }, { action: 'ping' }]);

      socket.serverClose();
      jest.advanceTimersByTime(10 * MINUTE);
      expect(socket.sent).toHaveLength(2);
    });
  });

  describe('logout', () => {
    beforeEach(() => watch());

    it('closes the socket and stops reconnecting', () => {
      login('abc');
      latest().serverAccept();
      const socket = latest();

      logout();
      jest.advanceTimersByTime(60 * MINUTE);

      expect(socket.closed).toBe(true);
      expect(sockets()).toHaveLength(1);
    });

    it('cancels a pending reconnect', () => {
      login('abc');
      latest().serverClose();

      logout();
      jest.advanceTimersByTime(60 * MINUTE);

      expect(sockets()).toHaveLength(1);
    });

    it('connects again on the next login', () => {
      login('abc');
      logout();
      login('def');

      expect(sockets()).toHaveLength(2);
      expect(latest().url).toBe('wss://rt.example/ws?token=def');
    });
  });
});
