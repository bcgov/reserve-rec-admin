import { Component, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { PermissionDirective } from '../../directives/permission.directive';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, PermissionDirective]
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
    protected router: Router,
    protected permissionsService: PermissionsService
  ) {}

  onNavigate(route) {}

  getPathFromUrl(url) {
    return url.split('?')[0];
  }
}
