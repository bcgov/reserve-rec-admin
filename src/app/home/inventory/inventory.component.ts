import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-inventory-component',
    imports: [CommonModule],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  numberOfPermits = 0; 

  seeAll() {
    console.log('See all permits');
  }

  createNew() {
    console.log('Create new permit');
  }
}