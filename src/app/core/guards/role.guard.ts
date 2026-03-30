import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true; // user is an admin
  }

  // Fallback to check localStorage directly
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const payload = JSON.parse(atob(user.token.split('.')[1]));
        if (payload.role === 'ROLE_ADMIN') {
          return true;
        }
      } catch (e) {}
    }
  }

  // Not authorised, redirect to pharmacien dashboard
  return router.parseUrl('/pharmacien/caisse');
};
