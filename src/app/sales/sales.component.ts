import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../shared/components/breadcrumb/breadcrumb.component';
import { NgIf } from '@angular/common';
@Component({
  selector: 'app-sales-component',
  imports: [RouterModule, BreadcrumbComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent {

}
