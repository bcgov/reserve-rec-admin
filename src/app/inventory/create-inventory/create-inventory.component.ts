import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CreateInventorySelectorComponent } from './create-inventory-selector/create-inventory-selector.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-inventory',
  imports: [RouterOutlet, CreateInventorySelectorComponent, CommonModule],
  templateUrl: './create-inventory.component.html',
  styleUrl: './create-inventory.component.scss'
})
export class CreateInventoryComponent {

  constructor(protected router: Router) {}

  showSelectionOptions(): boolean {
    const urlParts = this.router.url.split('/');
    if (urlParts[urlParts.length-1] === 'create') {
      return true;
    }
    return false;
  }
}
