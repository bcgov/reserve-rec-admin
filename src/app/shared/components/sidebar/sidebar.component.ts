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
    // After navigating: collapse the mobile sidebar, and drop focus from the
    // clicked nav link. A clicked link keeps DOM focus, and browser back/forward
    // doesn't move it — the sidebar's `:focus` style is the same gold as the
    // active link, so a stale focused link looks like a second active item.
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          this.sidebarService.close();
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            active.closest('#sidebar') &&
            !active.matches(':focus-visible') // keep real keyboard focus
          ) {
            active.blur();
          }
        })
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
