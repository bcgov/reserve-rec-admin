import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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
export class CreateInventoryComponent {
  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      { label: 'Create', link: this.activeChildLabel() ? ['/inventory/create'] : undefined },
    ];
    const child = this.activeChildLabel();
    if (child) items.push({ label: child });
    return items;
  }

  private activeChildLabel(): string | null {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    // /inventory/create -> ['inventory', 'create'], no child
    // /inventory/create/collection -> ['inventory', 'create', 'collection']
    const childSlug = parts[2];
    if (!childSlug) return null;
    return childSlug.charAt(0).toUpperCase() + childSlug.slice(1);
  }

  constructor(protected router: Router) {}

  showSelectionOptions(): boolean {
    const urlParts = this.router.url.split('/');
    if (urlParts[urlParts.length-1] === 'create') {
      return true;
    }
    return false;
  }
}
