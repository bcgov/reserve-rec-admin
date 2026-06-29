import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { PermissionsService } from '../../../services/permissions.service';
import { PermissionDirective } from '../../directives/permission.directive';
import { SidebarService } from '../../../services/sidebar.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, PermissionDirective]
})
export class SidebarComponent implements OnInit, OnDestroy {
  public isOpen = false;

  private subscriptions = new Subscription();

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
    protected permissionsService: PermissionsService,
    protected sidebarService: SidebarService,
    protected authService: AuthService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.sidebarService.isOpen$.subscribe((open) => (this.isOpen = open))
    );
    // Collapse the mobile sidebar after navigating so it doesn't stay open
    // over the page content.
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.sidebarService.close())
    );
  }

  async logout() {
    this.sidebarService.close();
    await this.authService.logout();
  }

  onNavigate(route) {}

  getPathFromUrl(url) {
    return url.split('?')[0];
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
