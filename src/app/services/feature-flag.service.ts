import { Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';

export interface FeatureFlagMetadata {
  lastUpdated: string;
  updatedBy: string;
  updatedByEmail: string;
}

export interface FeatureFlagAdminResponse {
  flags: Record<string, boolean>;
  metadata: FeatureFlagMetadata | null;
  version: number;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private _flags = signal<Record<string, boolean>>({});
  private _initialized = signal<boolean>(false);
  
  // Public readonly signals
  public flags = this._flags.asReadonly();
  public initialized = this._initialized.asReadonly();

  // Default flags (used as fallback)
  private readonly defaultFlags: Record<string, boolean> = {
    enablePayments: true
  };

  constructor(
    private apiService: ApiService,
    private loggerService: LoggerService
  ) {}

  /**
   * Initialize feature flags - called during app bootstrap
   */
  async init(): Promise<void> {
    try {
      this.loggerService.debug('Initializing feature flags...');
      const response = await lastValueFrom(this.apiService.get('featureFlags'));
      this._flags.set(response || this.defaultFlags);
      this._initialized.set(true);
      this.loggerService.debug('Feature flags initialized:', this._flags());
    } catch (error) {
      this.loggerService.error('Failed to load feature flags, using defaults:', error);
      this._flags.set(this.defaultFlags);
      this._initialized.set(true);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagKey: string): boolean {
    const flags = this._flags();
    return flags[flagKey] ?? this.defaultFlags[flagKey] ?? false;
  }

  /**
   * Get feature flags with admin metadata
   */
  async getFeatureFlagsAdmin(): Promise<FeatureFlagAdminResponse> {
    const response = await lastValueFrom(
      this.apiService.get('featureFlags', { admin: true })
    );
    return response;
  }

  /**
   * Update feature flags (superadmin only)
   */
  async updateFeatureFlags(flags: Record<string, boolean>): Promise<FeatureFlagAdminResponse> {
    const response = await lastValueFrom(
      this.apiService.put('featureFlags', { flags })
    );
    // Update local state
    this._flags.set(response.flags);
    return response;
  }
}
