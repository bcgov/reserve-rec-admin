import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CreateInventorySelectorComponent } from './create-inventory-selector/create-inventory-selector.component';
import { CommonModule } from '@angular/common';
import { PermissionDirective } from '../../shared/directives/permission.directive';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-create-inventory',
  imports: [RouterOutlet, CreateInventorySelectorComponent, CommonModule, PermissionDirective, BreadcrumbComponent],
  templateUrl: './create-inventory.component.html',
  styleUrl: './create-inventory.component.scss'
})
export class CreateInventoryComponent implements OnDestroy {
  // Driven by NavigationEnd events so the template re-evaluates on every
  // completed route change — including browser back/forward. Reading
  // `router.url` from getters in the template was unreliable under zone
  // event-coalescing: after a back-then-sibling-link navigation the
  // previously-mounted child sometimes lingered (see #189).
  public childSlug: string | null = null;
  private routerSub: Subscription;

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      { label: 'Create', link: this.childSlug ? ['/inventory/create'] : undefined },
    ];
    if (this.childSlug) {
      items.push({ label: this.childSlug.charAt(0).toUpperCase() + this.childSlug.slice(1) });
    }
    return items;
  }

  constructor(protected router: Router) {
    this.updateChildSlug(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateChildSlug(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateChildSlug(url: string): void {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    // /inventory/create        -> ['inventory', 'create'], no child
    // /inventory/create/<slug> -> ['inventory', 'create', '<slug>']
    this.childSlug = parts[2] ?? null;
  }

  showSelectionOptions(): boolean {
    return this.childSlug === null;
  }
}
