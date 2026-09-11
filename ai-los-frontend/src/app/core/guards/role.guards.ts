import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole('customer')) {
    return true;
  }

  // Staff redirected to their respective work queues
  if (auth.hasRole('loan_officer')) {
    router.navigate(['/officer']);
  } else if (auth.hasRole('manager')) {
    router.navigate(['/manager']);
  } else {
    router.navigate(['/unauthorized']);
  }
  return false;
};

export const officerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole(['loan_officer', 'admin'])) {
    return true;
  }

  // Strictly block customer from officer dashboard
  router.navigate(['/unauthorized']);
  return false;
};

export const managerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole(['manager', 'admin'])) {
    return true;
  }

  // Strictly block customer and officer from manager dashboard
  router.navigate(['/unauthorized']);
  return false;
};

export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole(['loan_officer', 'manager', 'auditor', 'admin'])) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  // If already logged in, redirect to the user's role workspace
  if (auth.hasRole('loan_officer')) {
    router.navigate(['/officer']);
  } else if (auth.hasRole('manager')) {
    router.navigate(['/manager']);
  } else {
    router.navigate(['/customer']);
  }
  return false;
};

export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.hasRole('loan_officer')) {
    router.navigate(['/officer']);
  } else if (auth.hasRole('manager')) {
    router.navigate(['/manager']);
  } else {
    router.navigate(['/customer']);
  }
  return false;
};
