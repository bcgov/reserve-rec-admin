import {
  Directive,
  effect,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { PermissionsService } from '../../services/permissions.service';

/**
 * Structural directive that shows an element only when the current user
 * meets the required permission tier for an optional collection.
 *
 * Usage:
 *   <!-- Minimum tier required, any collection -->
 *   <button *appPermissionRequired="'staff'">Edit</button>
 *
 *   <!-- Scoped to a specific collection -->
 *   <button *appPermissionRequired="'staff'; collection: collectionId">Edit</button>
 *
 *   <!-- No argument — visible to any authenticated user with any permission -->
 *   <div *appPermissionRequired>...</div>
 *
 * The directive re-evaluates reactively whenever the permissions signal changes
 * (e.g. after login, logout, or token refresh).
 */
@Directive({
  selector: '[appPermissionRequired]',
  standalone: true,
})
export class PermissionDirective {
  private requiredTier: string | null = null;
  private collectionId: string | null = null;

  @Input() set appPermissionRequired(tier: string | null | undefined) {
    this.requiredTier = tier ?? null;
    this.update();
  }

  @Input() set appPermissionRequiredCollection(collectionId: string | null | undefined) {
    this.collectionId = collectionId ?? null;
    this.update();
  }

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private permissionsService: PermissionsService
  ) {
    // Re-evaluate whenever the permissions signal changes
    effect(() => {
      this.permissionsService.permissions();
      this.update();
    });
  }

  private update() {
    const allowed = this.requiredTier
      ? this.permissionsService.hasPermission(
          this.requiredTier,
          this.collectionId ?? undefined
        )
      : this.permissionsService.permissions() !== null;

    if (allowed) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}
