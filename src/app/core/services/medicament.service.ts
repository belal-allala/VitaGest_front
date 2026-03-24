import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Medicament } from '../models/medicament.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicamentService {
  private apiUrl = `${environment.apiUrl}/medicaments`;
  private http = inject(HttpClient);

  constructor() { }

  getAllMedicaments(): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getMedicamentById(id: number): Observable<Medicament> {
    return this.http.get<Medicament>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createMedicament(medicament: Medicament): Observable<Medicament> {
    return this.http.post<Medicament>(this.apiUrl, medicament).pipe(catchError(this.handleError));
  }

  updateMedicament(id: number, medicament: Medicament): Observable<Medicament> {
    return this.http.put<Medicament>(`${this.apiUrl}/${id}`, medicament).pipe(catchError(this.handleError));
  }

  deleteMedicament(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    if (error.status === 404) {
      errorMessage = 'Ressource introuvable (404).';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé (403). Vous n\'avez pas les droits.';
    } else if (error.status === 400) {
      errorMessage = 'Requête invalide. Vérifiez vos données.';
    }
    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
