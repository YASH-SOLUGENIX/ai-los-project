import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { CustomerDashboardComponent } from './features/customer/customer-dashboard.component';
import { OfficerDashboardComponent } from './features/officer/officer-dashboard.component';
import { ManagerDashboardComponent } from './features/manager/manager-dashboard.component';
import { AuditViewComponent } from './features/audit/audit-view.component';
import { UnauthorizedComponent } from './shared/unauthorized/unauthorized.component';
import {
  customerGuard,
  guestGuard,
  homeRedirectGuard,
  managerGuard,
  officerGuard,
  staffGuard,
} from './core/guards/role.guards';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'customer',
    component: CustomerDashboardComponent,
    canActivate: [customerGuard],
  },
  {
    path: 'officer',
    component: OfficerDashboardComponent,
    canActivate: [officerGuard],
  },
  {
    path: 'manager',
    component: ManagerDashboardComponent,
    canActivate: [managerGuard],
  },
  {
    path: 'audit',
    component: AuditViewComponent,
    canActivate: [staffGuard],
  },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '', canActivate: [homeRedirectGuard], children: [] },
  { path: '**', canActivate: [homeRedirectGuard], children: [] },
];
