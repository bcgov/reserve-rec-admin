import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app-routing.module';
import { ConfigService } from './services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { AutoFetchService } from './services/auto-fetch.service';
import { ToastService } from './services/toast.service';

import { provideAnimations } from '@angular/platform-browser/animations';

import { provideToastr } from 'ngx-toastr';
import { AuthService } from './services/auth.service';
import { WebsocketService } from './services/ws.service';
import { ApiService } from './services/api.service';

export function initConfig(
  configService: ConfigService,
  authService: AuthService,
  apiService: ApiService,
  websocketService: WebsocketService
) {
  return async () => {
    await configService.init();
    await authService.init();
    apiService.init();
    await websocketService.init(configService.config['WEBSOCKET_URL']);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(() => {
        const initializerFn = (initConfig)(inject(ConfigService), inject(AuthService), inject(ApiService), inject(WebsocketService));
        return initializerFn();
      }),
    ConfigService,
    AutoFetchService,
    ToastService,
    provideAnimations(), // required animations providers
    provideToastr(), // Toastr providers
  ]
};
