import { Routes } from '@angular/router';
import { UserGuard } from './guards/user.guard';
import { AdminGuard } from './guards/admin.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { GeozoneResolver } from './resolvers/geozone.resolver';
import { ProtectedAreaResolver } from './resolvers/protected-area.resolver';
import { FacilityResolver } from './resolvers/facility.resolver';
import { ActivityResolver } from './resolvers/activity.resolver';
import { policyResolver } from './resolvers/policy.resolver';
import { ProductResolver } from './resolvers/product.resolver';

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
    path: 'unauthorized',
    loadComponent: () => import('./unauthorized/unauthorized.component').then(mod => mod.UnauthorizedComponent)
  },
  {
    path: 'sales',
    loadComponent: () => import('./sales/sales.component').then(mod => mod.SalesComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers.component').then(mod => mod.CustomersComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'staff' },
    children: [
      {
        path: ':id',
        loadComponent: () => import('./customers/customer-detail/customer-detail.component').then(mod => mod.CustomerDetailComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./customers/customer-edit/customer-edit.component').then(mod => mod.CustomerEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      }
    ]
  },
  // Inventory
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory.component').then(mod => mod.InventoryComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
  },
  {
    path: 'inventory/create',
    loadComponent: () => import('./inventory/create-inventory/create-inventory.component').then(mod => mod.CreateInventoryComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
    children: [
      {
        path: 'geozone',
        loadComponent: () => import('./inventory/create-inventory/geozone-create/geozone-create.component').then(mod => mod.GeozoneCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'facility',
        loadComponent: () => import('./inventory/create-inventory/facility-create/facility-create.component').then(mod => mod.FacilityCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'activity',
        loadComponent: () => import('./inventory/create-inventory/activity-create/activity-create.component').then(mod => mod.ActivityCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'product',
        loadComponent: () => import('./inventory/create-inventory/product-create/product-create.component').then(mod => mod.ProductCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'policy',
        loadComponent: () => import('./inventory/create-inventory/policy-create/policy-create.component').then(mod => mod.PolicyCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'relationships',
        loadComponent: () => import('./inventory/create-inventory/relationship-create/relationship-create.component').then(mod => mod.RelationshipCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
    ],
  },
  {
    path: 'inventory/geozone/:collectionId/:geozoneId',
    loadComponent: () => import('./inventory/geozone/geozone.component').then(mod => mod.GeozoneComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { geozone: GeozoneResolver },
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/geozone/geozone-details/geozone-details.component').then(mod => mod.GeozoneDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      },
      {
        path: 'edit',
        loadComponent: () => import('./inventory/geozone/geozone-edit/geozone-edit.component').then(mod => mod.GeozoneEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      }
    ]
  },
  {
    path: 'inventory/facility/:collectionId/:facilityType/:facilityId',
    loadComponent: () => import('./inventory/facility/facility.component').then(mod => mod.FacilityComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { facility: FacilityResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/facility/facility-details/facility-details.component').then(mod => mod.FacilityDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' }
      },
      {
        path: 'edit',
        loadComponent: () => import('./inventory/facility/facility-edit/facility-edit.component').then(mod => mod.FacilityEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' }

      }
    ]
  },
  {
    path: 'inventory/activity/:collectionId/:activityType/:activityId',
    loadComponent: () => import('./inventory/activity/activity.component').then(mod => mod.ActivityComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { activity: ActivityResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/activity/activity-details/activity-details.component').then(mod => mod.ActivityDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      },
      {
        path: 'edit',
        loadComponent: () => import('./inventory/activity/activity-edit/activity-edit.component').then(mod => mod.ActivityEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      }
    ]
  },
  {
    path: 'inventory/policy/:policyType/:policyId',
    loadComponent: () => import('./inventory/policy/policy.component').then(mod => mod.PolicyComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { policy: policyResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        redirectTo: 'latest',
        pathMatch: 'full'
      },
      {
        path: ':policyIdVersion',
        loadComponent: () => import('./inventory/policy/policy-details/policy-details.component').then(mod => mod.PolicyDetailsComponent),
        resolve: { policy: policyResolver },
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
        children: [
        ]
      }
    ]
  },
  {
    path: 'inventory/product/:collectionId/:activityType/:activityId/:productId',
    loadComponent: () => import('./inventory/product/product.component').then(mod => mod.ProductComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { product: ProductResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/product/product-details/product-details.component').then(mod => mod.ProductDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      },
      {
        path: 'edit',
        loadComponent: () => import('./inventory/product/product-edit/product-edit.component').then(mod => mod.ProductEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      }
    ]
  },
  {
    path: 'inventory/product-date/:collectionId/:activityType/:activityId/:productId/:date',
    loadComponent: () => import('./inventory/product-date/product-date-details/product-date-details.component').then(mod => mod.ProductDateDetailsComponent),
    canActivate: [UserGuard],
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(mod => mod.ReportsComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
},
  {
    path: 'reports/daily-passes',
    loadComponent: () => import('./reports/daily-passes/daily-passes-report.component').then(mod => mod.DailyPassesReportComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
  },
  {
    path: 'admin/feature-flags',
    loadComponent: () => import('./admin/feature-flags/feature-flags.component').then(mod => mod.FeatureFlagsComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
  },
  {
    path: 'admin/waiting-room',
    loadComponent: () => import('./admin/waiting-room/waiting-room-admin.component').then(mod => mod.WaitingRoomAdminComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
  },
  {
    path: 'inventory/protected-area/:orcs',
    loadComponent: () => import('./inventory/protected-area/protected-area-details/protected-area-details.component').then(mod => mod.ProtectedAreaDetailsComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { protectedArea: ProtectedAreaResolver }
  },
  {
    path: 'inventory/protected-area/:orcs/edit',
    loadComponent: () => import('./inventory/protected-area/protected-area-edit/protected-area-edit.component').then(mod => mod.ProtectedAreaEditComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
    resolve: { protectedArea: ProtectedAreaResolver }
  },
];
