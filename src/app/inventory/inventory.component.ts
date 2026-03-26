import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventorySearchComponent } from './inventory-search/inventory-search.component';
import { Router } from '@angular/router';
import { PermissionDirective } from '../shared/directives/permission.directive';

@Component({
  selector: 'app-inventory-component',
  imports: [InventorySearchComponent, CommonModule, PermissionDirective],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent {

  constructor(
    protected router: Router
  ) {}

  createNewInventory() {
    this.router.navigate(['/inventory/create']);
  }

}
