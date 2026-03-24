import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private http = inject(HttpClient);

  constructor() { }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(catchError(this.handleError));
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(catchError(this.handleError));
  }

  toggleActiveStatus(id: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/toggle-active`, {}).pipe(catchError(this.handleError));
  }

  resetPassword(id: number, newPassword: Partial<User>): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/reset-password`, newPassword).pipe(catchError(this.handleError));
  }
  
  deleteUser(id: number): Observable<void> {
     return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue lors de la gestion utilisateur.';
    if (error.status === 404) {
      errorMessage = 'Utilisateur introuvable (404).';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé. Vous n\'avez pas les droits d\'administrateur (403).';
    } else if (error.status === 409) {
      errorMessage = 'Conflit (409) : Cet email (ou nom d\'utilisateur) est déjà utilisé.';
    } else if (error.status === 400) {
      errorMessage = 'Requête invalide. Veuillez vérifier les champs du formulaire.';
    }
    console.error('User API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
