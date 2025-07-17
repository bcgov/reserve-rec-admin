import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventorySearchComponent } from './inventory-search/inventory-search.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inventory-component',
  imports: [InventorySearchComponent, CommonModule],
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