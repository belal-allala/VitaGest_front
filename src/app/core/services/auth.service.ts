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

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData)
      .pipe(catchError(this.handleError));
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
    if (user) {
      // Prioritize role property in user object
      if (user.role) {
        return user.role;
      }
      
      if (user.token) {
        try {
          // Fallback to token decoding
          const payload = JSON.parse(atob(user.token.split('.')[1]));
          
          if (payload.role) {
            return typeof payload.role === 'string' ? payload.role : (payload.role.authority || payload.role.nom || null);
          }
          if (payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
            return typeof payload.roles[0] === 'string' ? payload.roles[0] : (payload.roles[0].authority || payload.roles[0].nom || null);
          }
        } catch (e) {
          console.error('Error decoding token', e);
        }
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
