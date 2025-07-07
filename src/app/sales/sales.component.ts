import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-sales-component',
    imports: [CommonModule],
    templateUrl: './sales.component.html',
    styleUrl: './sales.component.scss'
})
export class SalesComponent {
  numberOfPermits = 0;

  seeAll() {
    console.log('See all permits');
  }

  createNew() {
    console.log('Create new permit');
  }
}