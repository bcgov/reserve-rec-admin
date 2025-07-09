import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-inventory-selector',
  imports: [RouterLink, CommonModule],
  templateUrl: './create-inventory-selector.component.html',
  styleUrl: './create-inventory-selector.component.scss'
})
export class CreateInventorySelectorComponent {
  @Input() title: string = '';
  @Input() titleClasses: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() link: string = '';
  @Input() disabled: boolean = false;

  getButtonClasses(): string {
    if (this.disabled) {
      return 'border-light text-secondary bg-light disabled';
    }
    return 'border-primary';
  }

}
