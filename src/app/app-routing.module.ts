import { Routes } from '@angular/router';
import { UserGuard } from './guards/user.guard';
import { GeozoneResolver } from './resolvers/geozone.resolver';
import { ProtectedAreasResolver } from './resolvers/protected-areas.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(mod => mod.HomeComponent)
  },
  {
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(mod => mod.LoginComponent)
  },
  {
    path: 'logout',
    loadComponent: () => import('./logout/logout.component').then(mod => mod.LogoutComponent), canActivate: [UserGuard]
  },
  {
    path: 'sales',
    loadComponent: () => import('./sales/sales.component').then(mod => mod.SalesComponent), canActivate: [UserGuard]
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers.component').then(mod => mod.CustomersComponent),
    canActivate: [UserGuard]
  },
  // Inventory
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory.component').then(mod => mod.InventoryComponent),
    canActivate: [UserGuard]
  },
  {
    path: 'inventory/create',
    loadComponent: () => import('./inventory/create-inventory/create-inventory.component').then(mod => mod.CreateInventoryComponent),
    canActivate: [UserGuard],
    children: [
      {
        path: 'geozone',
        loadComponent: () => import('./inventory/create-inventory/geozone-create/geozone-create.component').then(mod => mod.GeozoneCreateComponent)
      },
      {
        path: 'facility',
        loadComponent: () => import('./inventory/create-inventory/facility-create/facility-create.component').then(mod => mod.FacilityCreateComponent)
      },
      {
        path: 'activity',
        loadComponent: () => import('./inventory/create-inventory/activity-create/activity-create.component').then(mod => mod.ActivityCreateComponent)
      },
    ],
  },
  {
    path: 'inventory/geozone/:gzCollectionId/:geozoneId',
    loadComponent: () => import('./inventory/geozone/geozone.component').then(mod => mod.GeozoneComponent),
    canActivate: [UserGuard],
    resolve: { geozone: GeozoneResolver },
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/geozone/geozone-details/geozone-details.component').then(mod => mod.GeozoneDetailsComponent),
        canActivate: [UserGuard],
      },
      {
        path: 'edit',
        loadComponent: () => import('./inventory/geozone/geozone-edit/geozone-edit.component').then(mod => mod.GeozoneEditComponent),
        canActivate: [UserGuard],
      }
    ]
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(mod => mod.ReportsComponent),
    canActivate: [UserGuard]
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers.component').then(mod => mod.CustomersComponent),
    canActivate: [UserGuard]
  },
  {
    path: 'inventory/protected-area',
    loadComponent: () => import('./inventory/protected-area/protected-area.component').then(mod => mod.ProtectedAreaComponent),
    canActivate: [UserGuard]
  },
  {
    path: 'inventory/protected-area/:orcs',
    loadComponent: () => import('./inventory/protected-area/protected-area-details/protected-area-details.component').then(mod => mod.ProtectedAreaDetailsComponent),
    canActivate: [UserGuard],
    resolve: { protectedArea: ProtectedAreasResolver }
  },
  {
    path: 'inventory/protected-area/:orcs/edit',
    loadComponent: () => import('./inventory/protected-area/protected-area-edit/protected-area-edit.component').then(mod => mod.ProtectedAreaEditComponent),
    canActivate: [UserGuard],
    resolve: { protectedArea: ProtectedAreasResolver }
  },
];
