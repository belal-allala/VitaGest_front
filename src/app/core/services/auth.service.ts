import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoginRequest, AuthResponse } from '../models/auth.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<AuthResponse | null>;
  public currentUser: Observable<AuthResponse | null>;
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {
    let storedUser = null;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          storedUser = JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing stored user', e);
        }
      }
    }
    this.currentUserSubject = new BehaviorSubject<AuthResponse | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/authenticate`, credentials)
      .pipe(
        map(user => {
          if (user && user.token) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
          return user;
        }),
        catchError(this.handleError)
      );
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = `Server returned code: ${error.status}, error message is: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getRole(): string | null {
    const user = this.currentUserValue;
    if (user && user.token) {
      try {
        const payload = JSON.parse(atob(user.token.split('.')[1]));
        
        // Handle Spring Security 'roles' array
        if (payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
             const r = payload.roles[0];
             return typeof r === 'string' ? r : (r.authority || r.nom || null);
        }
        // Handle Spring Security 'authorities' array
        if (payload.authorities && Array.isArray(payload.authorities) && payload.authorities.length > 0) {
             const auth = payload.authorities[0];
             return typeof auth === 'string' ? auth : (auth.authority || auth.nom || null);
        }
        // Handle flat 'role' (string or object)
        if (payload.role) {
             return typeof payload.role === 'string' ? payload.role : (payload.role.authority || payload.role.nom || null);
        }

        return null;
      } catch (e) {
        console.error('Error decoding token', e);
        return null;
      }
    }
    return null;
  }

  isAdmin(): boolean {
    const role = this.getRole();
    return role === 'ROLE_ADMIN';
  }

  isEmployee(): boolean {
    const role = this.getRole();
    return role === 'ROLE_EMPLOYEE' || role === 'ROLE_PHARMACIEN';
  }
}
