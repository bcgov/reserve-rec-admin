import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';

const TIER_RANK: Record<string, number> = { limited: 1, staff: 2, superadmin: 99 };

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  public permissions = signal<Record<string, string> | null>(null);

  readonly allAccessRoleName = 'superadmin';

  constructor(
    protected loadingService: LoadingService,
    private configService: ConfigService,
    private http: HttpClient,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async load(token) {
    try {
      const apiLocation = this.configService.config['API_LOCATION'];
      const apiPath = this.configService.config['API_PATH'];
      const baseUrl = (apiPath && apiLocation !== 'http://localhost:3000')
        ? apiLocation + apiPath
        : apiLocation;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
      const res = await firstValueFrom(this.http.get(`${baseUrl}/users/me`, { headers })) as any;
      this.loggerService.debug(`Permissions loaded: ${JSON.stringify(res)}`);
      this.permissions.set(res?.data?.permissions ?? null);
    } catch (error) {
      this.loggerService.error(`Error loading permissions: ${error}`);
      this.permissions.set(null);
    }
  }

  clear() {
    this.permissions.set(null);
  }

  // Send back if the user is staff (or superadmin) for conditional UI rendering
  isAdmin() {
    const perms = this.permissions();
    return perms?.[this.allAccessRoleName] === this.allAccessRoleName;
  }

  isSuperAdmin() {
    return this.permissions()?.[this.allAccessRoleName] === this.allAccessRoleName;
  }

  // Check whether the user meets a minimum tier requirement
  // If collectionId is provided the check is scoped to that collection only,
  // otherwise it passes if the user has the tier on any collection they manage
  hasPermission(required, collectionId?) {
    if (this.isSuperAdmin()) return true;

    const perms = this.permissions();
    if (!perms) return false;

    const requiredRank = TIER_RANK[required] ?? 0;

    if (collectionId) {
      return (TIER_RANK[perms[collectionId]] ?? 0) >= requiredRank;
    }

    return Object.values(perms).some(tier => (TIER_RANK[tier] ?? 0) >= requiredRank);
  }
}
