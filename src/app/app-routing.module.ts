import { Routes } from '@angular/router';
import { UserGuard } from './guards/user.guard';
import { GeozoneResolver } from './resolvers/geozone.resolver';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(mod => mod.HomeComponent) },
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./login/login.component').then(mod => mod.LoginComponent) },
  { path: 'logout', loadComponent: () => import('./logout/logout.component').then(mod => mod.LogoutComponent), canActivate: [UserGuard] },
  { path: 'sales', loadComponent: () => import('./sales/sales.component').then(mod => mod.SalesComponent), canActivate: [UserGuard] },
  { path: 'customers', loadComponent: () => import('./customers/customers.component').then(mod => mod.CustomersComponent), canActivate: [UserGuard] },
  // Inventory
  { path: 'inventory', loadComponent: () => import('./inventory/inventory.component').then(mod => mod.InventoryComponent), canActivate: [UserGuard] },
  { path: 'inventory/geozone/:gzCollectionId/:geozoneId', loadComponent: () => import('./inventory/geozone/geozone.component').then(mod => mod.GeozoneComponent), canActivate: [UserGuard], resolve: { geozone: GeozoneResolver } },
  { path: 'reports', loadComponent: () => import('./reports/reports.component').then(mod => mod.ReportsComponent), canActivate: [UserGuard] },
];