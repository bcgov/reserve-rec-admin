import { Component, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class SidebarComponent {
  @HostBinding('class.is-toggled')
  public hide = false;

  public routes = [
    { path: 'dashboard', data: { label: 'Dashboard' } },
    { path: 'inventory', data: { label: 'Inventory' } },
    { path: 'reports', data: { label: 'Reports' } },
    { path: 'parks', data: { label: 'Parks' } },
    { path: 'customers', data: { label: 'Customers' } }
  ];
  public currentRoute: any;

  constructor(
    protected router: RouterModule
  ) {
    
  }

  onNavigate(route) {
  }


  getPathFromUrl(url) {
    return url.split('?')[0];
  }
}