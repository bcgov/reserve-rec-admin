import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { Subscription, merge, of, fromEvent, map, throwError, catchError, pipe } from 'rxjs';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root',
})
export class ApiService implements OnDestroy {
  public token: string;
  public isMS: boolean; // IE, Edge, etc
  networkStatus = false;
  networkStatus$: Subscription = Subscription.EMPTY;
  private headers;
  private http: HttpClient;

  apiPath: string;
  env: 'local' | 'dev' | 'test' | 'prod';

  constructor(private configService: ConfigService,
    private authService: AuthService
  ) {
    this.http = inject(HttpClient);
  }

  // Provide a getter for others to check current state.
  get isNetworkOffline() {
    return !this.networkStatus;
  }

  errorHandler(error: HttpErrorResponse) {
    return throwError(() => new Error(error.message));
  }

  ngOnDestroy() {
    this.networkStatus$.unsubscribe();
  }

  async init() {
    // If config is setting api, override.
    if (this.configService.config['API_LOCATION']) {
      if (this.configService.config['API_PATH'] && this.configService.config['API_LOCATION'] !== 'http://localhost:3000') {
        this.apiPath = this.configService.config['API_LOCATION'] + this.configService.config['API_PATH'];
      } else {
        this.apiPath = this.configService.config['API_LOCATION'];
      }
    } else {
      this.apiPath = window.location.origin + '/api';
    }

    this.headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.env = this.configService.config['ENVIRONMENT'];
    this.checkNetworkStatus();

    // Ensure network status is properly set before proceeding
    console.log('ApiService initialized, network status:', this.networkStatus);

    // If network status is still false, force it to true as we're in a browser environment
    if (!this.networkStatus) {
      console.log('Forcing network status to true');
      this.networkStatus = true;
    }
  }

  updateHeaders() {
    this.token = this.authService.jwtToken;
    if (this.token) {
      this.headers = this.headers.set('Authorization', `Bearer ${this.token}`);
    } else {
      this.headers = this.headers.set('Authorization', 'guest');
    }
  }

  checkNetworkStatus() {
    console.log('navigator:', navigator);
    this.networkStatus = navigator.onLine;
    this.networkStatus$ = merge(of(null),
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    )
      .pipe(map(() => navigator.onLine))
      .subscribe((status) => {
        console.log(status === false ? 'Network Offline' : 'Network Online');
        this.networkStatus = status;
      });
  }

  public getEnvironment(): string {
    return this.env;
  }

  get(pk, queryParamsObject = null as any) {
    if (this.networkStatus) {
      const queryString = this.generateQueryString(queryParamsObject);
      // If logged in, add the JWT token to the headers.
      this.updateHeaders();
      return this.http.get(`${this.apiPath}/${pk}?${queryString}`, { headers: this.headers, observe: 'response' })
        .pipe(
          map(response => response?.body),
          catchError(this.errorHandler)
        );
    } else {
      throw 'Network Offline';
    }
  }

  post(pk, obj, queryParamsObject = null as any) {
    if (this.networkStatus) {
      const queryString = this.generateQueryString(queryParamsObject);
      this.updateHeaders();
      return this.http
        .post<any>(`${this.apiPath}/${pk}?${queryString}`, obj, { headers: this.headers, observe: 'response' })
        .pipe(
          map(response => {
            return response?.body;
          }),
          catchError(this.errorHandler)
        );
    } else {
      throw 'Network Offline';
    }
  }

  put(pk, obj, queryParamsObject = null as any) {
    if (this.networkStatus) {
      const queryString = this.generateQueryString(queryParamsObject);
      // If logged in, append the JWT token to the headers.
      this.updateHeaders();
      return this.http.put<any>(`${this.apiPath}/${pk}?${queryString}`, obj, { headers: this.headers, observe: 'response' })
        .pipe(
          map(response => response?.body),
          catchError(this.errorHandler));
    } else {
      throw 'Network Offline';
    }
  }

  delete(pk, queryParamsObject = null as any) {
    if (this.networkStatus) {
      const queryString = this.generateQueryString(queryParamsObject);
      this.updateHeaders();
      return this.http
        .delete<any>(`${this.apiPath}/${pk}?${queryString}`, { headers: this.headers })
        .pipe(catchError(this.errorHandler));
    } else {
      throw 'Network Offline';
    }
  }

  private generateQueryString(queryParamsObject) {
    let queryString = '';
    if (queryParamsObject) {
      for (const key of Object.keys(queryParamsObject)) {
        queryString += `&${key}=${queryParamsObject[key]}`;
      }
      queryString = queryString.substring(1);
    }
    return queryString;
  }

  private buildUrl(apiPath, pathArray, queryParamsObject) {
    let url = apiPath;
    pathArray.forEach((path) => {
      url += `/${path}`;
    });
    url += `?${this.generateQueryString(queryParamsObject)}`;

    return url;
  }
}
