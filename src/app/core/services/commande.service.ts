import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Commande } from '../models/commande.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = `${environment.apiUrl}/commandes`;
  private http = inject(HttpClient);

  constructor() { }

  getAllCommandes(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getCommandeById(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createCommande(commande: Commande): Observable<Commande> {
    return this.http.post<Commande>(this.apiUrl, commande).pipe(catchError(this.handleError));
  }

  updateCommande(id: number, commande: Commande): Observable<Commande> {
    return this.http.put<Commande>(`${this.apiUrl}/${id}`, commande).pipe(catchError(this.handleError));
  }

  deleteCommande(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  recevoirCommande(id: number): Observable<Commande> {
    return this.http.post<Commande>(`${this.apiUrl}/${id}/recevoir`, {}).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue avec la commande';
    if (error.status === 404) {
       errorMessage = 'Commande introuvable (404).';
    } else if (error.status === 403) {
       errorMessage = 'Accès non autorisé pour les commandes (403).';
    } else if (error.status === 400) {
       errorMessage = error.error?.message || 'Données de commande invalides. Vérifiez les champs.';
    }
    console.error('Commande API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
