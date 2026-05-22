import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-create-inventory',
  imports: [RouterOutlet, CommonModule, BreadcrumbComponent],
  templateUrl: './create-inventory.component.html',
  styleUrl: './create-inventory.component.scss'
})
export class CreateInventoryComponent implements OnDestroy {
  // Tracks the current child slug for breadcrumb labelling. Updated from
  // NavigationEnd so it stays in sync with browser back/forward.
  public childSlug: string | null = null;
  // Cached so the @Input on app-breadcrumb gets a stable reference across CD
  // cycles. Re-creating the array via a getter caused the RouterLink directive
  // inside the breadcrumb to be torn down on every tick and miss click events.
  public breadcrumbs: BreadcrumbItem[] = [];
  private routerSub: Subscription;

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
    this.rebuildBreadcrumbs();
  }

  private rebuildBreadcrumbs(): void {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      { label: 'Create', link: this.childSlug ? ['/inventory/create'] : undefined },
    ];
    if (this.childSlug) {
      items.push({ label: this.childSlug.charAt(0).toUpperCase() + this.childSlug.slice(1) });
    }
    this.breadcrumbs = items;
  }
}
