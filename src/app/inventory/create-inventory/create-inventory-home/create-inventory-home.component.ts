import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateInventorySelectorComponent } from '../create-inventory-selector/create-inventory-selector.component';
import { PermissionDirective } from '../../../shared/directives/permission.directive';

@Component({
  selector: 'app-create-inventory-home',
  standalone: true,
  imports: [CommonModule, CreateInventorySelectorComponent, PermissionDirective],
  templateUrl: './create-inventory-home.component.html',
})
export class CreateInventoryHomeComponent {}
