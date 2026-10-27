import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app-routing.module';

describe('app routes', () => {
  it('pass the router config validation', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    expect(() => TestBed.inject(Router)).not.toThrow();
  });
});
