import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withInMemoryScrolling, RouteReuseStrategy, TitleStrategy } from '@angular/router';
import { NoReuseRouteStrategy } from './no-reuse-route-strategy';
import { PageTitleStrategy } from './page-title.strategy';

import { routes } from './app-routing.module';
import { ConfigService } from './services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { AutoFetchService } from './services/auto-fetch.service';
import { ToastService } from './services/toast.service';

import { provideAnimations } from '@angular/platform-browser/animations';

import { provideToastr } from 'ngx-toastr';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { FeatureFlagService } from './services/feature-flag.service';

export function initConfig(
  configService: ConfigService,
  authService: AuthService,
  apiService: ApiService,
  featureFlagService: FeatureFlagService
) {
  return async () => {
    await configService.init();
    await authService.init();
    await apiService.init();
    await featureFlagService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',  // top on forward nav, restore on back
      anchorScrolling: 'enabled',
    })),
    provideAppInitializer(() => {
        const initializerFn = (initConfig)(inject(ConfigService), inject(AuthService), inject(ApiService), inject(FeatureFlagService));
        return initializerFn();
      }),
    { provide: RouteReuseStrategy, useClass: NoReuseRouteStrategy },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    ConfigService,
    AutoFetchService,
    ToastService,
    provideAnimations(), // required animations providers
    provideToastr(), // Toastr providers
  ]
};
