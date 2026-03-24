import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUserValue) {
    return true; // user is authenticated
  }

  // Fallback to check localStorage directly in case BS missed it
  if (typeof window !== 'undefined' && localStorage.getItem('currentUser')) {
    return true;
  }

  // user is not authenticated, redirect to login page
  return router.parseUrl('/login');
};
