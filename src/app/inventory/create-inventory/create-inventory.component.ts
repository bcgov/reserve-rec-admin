import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CreateInventorySelectorComponent } from './create-inventory-selector/create-inventory-selector.component';

@Component({
  selector: 'app-create-inventory',
  imports: [RouterOutlet, CreateInventorySelectorComponent],
  templateUrl: './create-inventory.component.html',
  styleUrl: './create-inventory.component.scss'
})
export class CreateInventoryComponent {

}
