import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private ws: WebSocket;

  constructor() {}

  async init(url: string) {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.warn('WebSocket is already created and not closed.');
      return;
    }
    console.log('Creating WebSocket connection to:', url);
    try {
      if (!url) {
        throw new Error('WebSocket URL is required.');
      }
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        console.log('WebSocket connection opened');
        this.ws.onmessage = (event: MessageEvent) => this.handleMessage(event);
        this.ws.onerror = (event: Event) => this.handleError(event);
        this.ws.onclose = (event: CloseEvent) => this.handleClose(event);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }

    return Promise.resolve();
  }

  private handleMessage(event: MessageEvent): void {
    console.log('Message received:', event.data);
    // Add your custom logic here
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    // Add your custom logic here
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event);
    // Add your custom logic here
  }
}