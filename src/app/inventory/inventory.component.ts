import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventorySearchComponent } from './inventory-search/inventory-search.component';
import { Router } from '@angular/router';
import { PermissionDirective } from '../shared/directives/permission.directive';
import { BreadcrumbComponent, BreadcrumbItem } from '../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-inventory-component',
  imports: [InventorySearchComponent, CommonModule, PermissionDirective, BreadcrumbComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent {
  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Inventory' },
  ];

  constructor(
    protected router: Router
  ) {}

  createNewInventory() {
    this.router.navigate(['/inventory/create']);
  }

}
