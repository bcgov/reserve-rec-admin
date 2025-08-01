import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

declare global {
  interface Window { __env: any; }
}

//
// This service/class provides a centralized place to persist config values
// (eg, to share values between multiple components).
//

@Injectable()
export class ConfigService {
  private configuration: any = {};
  private build: any = '';

  constructor(private httpClient: HttpClient) { }
  /**
   * Initialize the Config Service.  Get configuration data from front-end build, or back-end if nginx
   * is configured to pass the /config endpoint to a dynamic service that returns JSON.
   */
  async init() {
    // Initially set the configuration and see if we should be contacting our hostname endpoint for
    // any configuration data.
    this.configuration = window['__env'];
    this.build = this.configuration?.['GH_HASH'] || 'local';

    if (this.configuration['configEndpoint'] === true) {
      try {
        // Attempt to get application via this.httpClient. This uses the url of the application that you are running it from
        // This will not work for local because it will try and get localhost:4200/api instead of 3000/api...
        this.configuration = await this.getConfigFromApi();
      } catch (e) {
        // If all else fails, we'll just use the variables found in env.js
        console.error('Error getting local configuration:', e);
      }
    }
    if (this.configuration['logLevel'] === 0) {
      console.log('Configuration:', this.configuration);
    }

    return Promise.resolve();
  }

  get logLevel(): any {
    if (window['__env'] && window['__env'].logLevel != undefined)
      // Can be overidden by the js console.
      return window['__env'].logLevel;
  }

  get config(): any {
    return this.configuration;
  }

  async delay(delayInms: any) {
    return new Promise((resolve) => setTimeout(resolve, delayInms));
  }

  async getConfigFromApi() {
    let n1 = 0;
    let n2 = 1;
    // We want to try and connect to API forever.
    // The delay is increased based on the fibonacci sequence.
    while (true) {
      try {
        return (await this.httpClient.get<any>(`/api/config?config=admin`).toPromise())['data'];
      } catch (err) {
        console.log(err);
        const delay = n1 + n2;
        await this.delay(delay * 1000);
        n1 = n2;
        n2 = delay;
      }
    }
  }
}
