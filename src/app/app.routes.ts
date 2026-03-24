import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './components/layout/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/dashboard'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'medicaments',
        loadComponent: () =>
          import('./features/medicaments/medicament-list/medicament-list.component').then(m => m.MedicamentListComponent),
      },
      {
        path: 'stocks',
        loadComponent: () =>
          import('./features/stocks/stock-list/stock-list.component').then(m => m.StockListComponent),
      },
      {
        path: 'ventes',
        loadComponent: () =>
          import('./features/ventes/point-de-vente/point-de-vente.component').then(m => m.PointDeVenteComponent),
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/prescriptions/prescription-list/prescription-list.component').then(m => m.PrescriptionListComponent),
      },
      {
        path: 'fournisseurs',
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/fournisseurs/fournisseur-list/fournisseur-list.component').then(m => m.FournisseurListComponent),
      },
      {
        path: 'commandes',
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/commandes/commande-list/commande-list.component').then(m => m.CommandeListComponent),
      },
      {
        path: 'utilisateurs',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/users/user-management/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/client-list/client-list.component').then(m => m.ClientListComponent),
      },
      {
        path: 'audits',
        canActivate: [roleGuard],
        loadComponent: () => import('./features/admin/audit-log/audit-log.component').then(m => m.AuditLogComponent)
      }
    ],
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];