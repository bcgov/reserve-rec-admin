import { NgModule, ApplicationRef, inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { SidebarModule } from './shared/components/sidebar/sidebar.module';
import { HeaderModule } from './header/header.module';
import { FooterModule } from './footer/footer.module';
import { HomeModule } from './home/home.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// Services
import { ConfigService } from './services/config.service';
import { ApiService } from './services/api.service';
import { AutoFetchService } from './services/auto-fetch.service';
import { AmplifyService } from './services/amplify.service';
import { LoggerService } from './services/logger.service';
import { ToastService } from './services/toast.service';
// If using Angular 16+ provideAppInitializer
import { provideAppInitializer } from '@angular/core';

export function initConfig(
  configService: ConfigService,
  apiService: ApiService,
  autoFetchService: AutoFetchService,
  amplifyService: AmplifyService
) {
  // return a function that returns a Promise or void
  return () => {
    // initialization logic here
    return Promise.resolve();
  };
}

@NgModule({
  declarations: [AppComponent, LoginComponent],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    SidebarModule,
    HeaderModule,
    FooterModule,
    HomeModule,
  ],
  providers: [
    provideAppInitializer(() =>
      initConfig(
        inject(ConfigService),
        inject(ApiService),
        inject(AutoFetchService),
        inject(AmplifyService)
      )()
    ),
    ConfigService,
    LoggerService,
    ToastService,
    AutoFetchService,
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(applicationRef: ApplicationRef) {
    Object.defineProperty(applicationRef, '_rootComponents', {
      get: () => applicationRef['components'],
    });
  }
}