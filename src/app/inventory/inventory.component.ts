import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-component',
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent {
  goToPark() {
    console.log('Go to park');
  }

  showAlerts() {
    console.log('Show alerts');
  }

  showClosures() {
    console.log('Show closures');
  }
}