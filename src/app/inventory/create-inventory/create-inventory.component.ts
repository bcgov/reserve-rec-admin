import { AfterViewChecked, ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CreateInventorySelectorComponent } from './create-inventory-selector/create-inventory-selector.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-inventory',
  imports: [RouterOutlet, CreateInventorySelectorComponent, CommonModule],
  templateUrl: './create-inventory.component.html',
  styleUrl: './create-inventory.component.scss'
})
export class CreateInventoryComponent implements AfterViewChecked{

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef
  ) {}

  ngAfterViewChecked(): void {
    // This is a workaround to ensure that the router outlet is updated after the view is checked
    // This is necessary because the router outlet may not update immediately after navigation
    this.cdr.detectChanges();
  }

  showSelectionOptions(): boolean {
    const urlParts = this.router.url.split('/');
    if (urlParts[urlParts.length-1] === 'create') {
      return true;
    }
    return false;
  }
}
