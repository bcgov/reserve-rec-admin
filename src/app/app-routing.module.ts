import { Routes } from '@angular/router';
import { UserGuard } from './guards/user.guard';
import { LoginGuard } from './guards/login.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { VerifyRedirectGuard } from './guards/verify-redirect.guard';
import { GeozoneResolver } from './resolvers/geozone.resolver';
import { CollectionResolver } from './resolvers/collection.resolver';
import { FacilityResolver } from './resolvers/facility.resolver';
import { ActivityResolver } from './resolvers/activity.resolver';
import { policyResolver } from './resolvers/policy.resolver';
import { ProductResolver } from './resolvers/product.resolver';
import { CreateInventoryHomeComponent } from './inventory/create-inventory/create-inventory-home/create-inventory-home.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard',
    loadComponent: () => import('./home/home.component').then(mod => mod.HomeComponent)
  },
  {
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'login',
    title: 'Log in',
    canActivate: [LoginGuard],
    loadComponent: () => import('./login/login.component').then(mod => mod.LoginComponent)
  },
  {
    path: 'logout',
    title: 'Log out',
    loadComponent: () => import('./logout/logout.component').then(mod => mod.LogoutComponent), canActivate: [UserGuard]
  },
  {
    path: 'unauthorized',
    title: 'Unauthorized',
    loadComponent: () => import('./unauthorized/unauthorized.component').then(mod => mod.UnauthorizedComponent)
  },
  {
    // Matches the URL encoded in a booking's QR code. Redirects into the
    // Sales QR scanner instead of rendering directly (bcgov/reserve-rec-admin#335).
    path: 'verify/:bookingId/:hash',
    canActivate: [UserGuard, VerifyRedirectGuard],
  },
  {
    path: 'sales',
    title: 'Sales',
    loadComponent: () => import('./sales/sales.component').then(mod => mod.SalesComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    children: [
      {
        path: 'qr-scanner',
        title: 'QR scanner',
        pathMatch: 'full',
        loadComponent: () => import('./sales/qr-scanner/qr-scanner-page.component').then(mod => mod.QrScannerPageComponent),
      },
      {
        path: 'pass-search',
        title: 'Pass search',
        pathMatch: 'full',
        loadComponent: () => import('./sales/pass-search/pass-search.component').then(mod => mod.PassSearchComponent),
      }
    ]
  },
  {
    path: 'customers',
    title: 'Customers',
    loadComponent: () => import('./customers/customers.component').then(mod => mod.CustomersComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'staff' },
    children: [
      {
        path: ':id',
        title: 'Customer details',
        loadComponent: () => import('./customers/customer-detail/customer-detail.component').then(mod => mod.CustomerDetailComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      },
      {
        path: ':id/edit',
        title: 'Edit customer',
        loadComponent: () => import('./customers/customer-edit/customer-edit.component').then(mod => mod.CustomerEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      }
    ]
  },
  // Inventory
  {
    path: 'inventory',
    title: 'Inventory',
    loadComponent: () => import('./inventory/inventory.component').then(mod => mod.InventoryComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
  },
  {
    path: 'inventory/capacity',
    title: 'Capacity management',
    loadComponent: () => import('./inventory/capacity-management/capacity-management.component').then(mod => mod.CapacityManagementComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
  },
  {
    path: 'inventory/create',
    title: 'Create inventory',
    loadComponent: () => import('./inventory/create-inventory/create-inventory.component').then(mod => mod.CreateInventoryComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: CreateInventoryHomeComponent,
      },
      {
        path: 'collection',
        title: 'Create collection',
        loadComponent: () => import('./inventory/create-inventory/collection-create/collection-create.component').then(mod => mod.CollectionCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'geozone',
        title: 'Create geozone',
        loadComponent: () => import('./inventory/create-inventory/geozone-create/geozone-create.component').then(mod => mod.GeozoneCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'facility',
        title: 'Create facility',
        loadComponent: () => import('./inventory/create-inventory/facility-create/facility-create.component').then(mod => mod.FacilityCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'activity',
        title: 'Create activity',
        loadComponent: () => import('./inventory/create-inventory/activity-create/activity-create.component').then(mod => mod.ActivityCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'product',
        title: 'Create product',
        loadComponent: () => import('./inventory/create-inventory/product-create/product-create.component').then(mod => mod.ProductCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'policy',
        title: 'Create policy',
        loadComponent: () => import('./inventory/create-inventory/policy-create/policy-create.component').then(mod => mod.PolicyCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
      {
        path: 'relationships',
        title: 'Create relationships',
        loadComponent: () => import('./inventory/create-inventory/relationship-create/relationship-create.component').then(mod => mod.RelationshipCreateComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      },
    ],
  },
  {
    path: 'inventory/collection/:collectionId',
    title: 'Collection',
    loadComponent: () => import('./inventory/collection/collection.component').then(mod => mod.CollectionComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { collection: CollectionResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/collection/collection-details/collection-details.component').then(mod => mod.CollectionDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' }
      },
      {
        path: 'edit',
        title: 'Edit collection',
        loadComponent: () => import('./inventory/collection/collection-edit/collection-edit.component').then(mod => mod.CollectionEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' }

      }
    ]
  },
  {
    path: 'inventory/geozone/:collectionId/:geozoneId',
    title: 'Geozone',
    loadComponent: () => import('./inventory/geozone/geozone.component').then(mod => mod.GeozoneComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
    resolve: { geozone: GeozoneResolver },
    runGuardsAndResolvers: 'always',
    children: [
      {
        path: '',
        loadComponent: () => import('./inventory/geozone/geozone-details/geozone-details.component').then(mod => mod.GeozoneDetailsComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      },
      {
        path: 'edit',
        title: 'Edit geozone',
        loadComponent: () => import('./inventory/geozone/geozone-edit/geozone-edit.component').then(mod => mod.GeozoneEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'superadmin' },
      }
    ]
  },
  {
    path: 'inventory/facility/:collectionId/:facilityType/:facilityId',
    title: 'Facility',
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
        title: 'Edit facility',
        loadComponent: () => import('./inventory/facility/facility-edit/facility-edit.component').then(mod => mod.FacilityEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' }

      }
    ]
  },
  {
    path: 'inventory/activity/:collectionId/:activityType/:activityId',
    title: 'Activity',
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
        title: 'Edit activity',
        loadComponent: () => import('./inventory/activity/activity-edit/activity-edit.component').then(mod => mod.ActivityEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'staff' },
      }
    ]
  },
  {
    path: 'inventory/policy/:policyType/:policyId',
    title: 'Policy',
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
    title: 'Product',
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
        title: 'Edit product',
        loadComponent: () => import('./inventory/product/product-edit/product-edit.component').then(mod => mod.ProductEditComponent),
        canActivate: [UserGuard, PermissionsGuard],
        data: { requiredPermission: 'limited' },
      }
    ]
  },
  {
    path: 'inventory/product-date/:collectionId/:activityType/:activityId/:productId/:date',
    title: 'Product date',
    loadComponent: () => import('./inventory/product-date/product-date-details/product-date-details.component').then(mod => mod.ProductDateDetailsComponent),
    canActivate: [UserGuard],
  },
  {
    path: 'reports',
    title: 'Reports',
    loadComponent: () => import('./reports/reports.component').then(mod => mod.ReportsComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
},
  {
    path: 'reports/daily-passes',
    title: 'Daily passes report',
    loadComponent: () => import('./reports/daily-passes/daily-passes-report.component').then(mod => mod.DailyPassesReportComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'limited' },
  },
  {
    path: 'admin/feature-flags',
    title: 'Feature flags',
    loadComponent: () => import('./admin/feature-flags/feature-flags.component').then(mod => mod.FeatureFlagsComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
  },
  {
    path: 'admin/waiting-room',
    title: 'Waiting room',
    loadComponent: () => import('./admin/waiting-room/waiting-room-admin.component').then(mod => mod.WaitingRoomAdminComponent),
    canActivate: [UserGuard, PermissionsGuard],
    data: { requiredPermission: 'superadmin' },
  },
];
