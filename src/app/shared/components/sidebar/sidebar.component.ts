import { Component, HostBinding, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class SidebarComponent implements OnInit {
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
  public isAdmin = signal<boolean>(false);

  constructor(
    protected router: Router,
    private authService: AuthService
  ) {
    
  }

  async ngOnInit(): Promise<void> {
    const isAdmin = await this.authService.userIsAdmin();
    this.isAdmin.set(isAdmin);
  }

  onNavigate(route) {
  }


  getPathFromUrl(url) {
    return url.split('?')[0];
  }
}