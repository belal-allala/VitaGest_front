import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Prescription } from '../models/prescription.model';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private apiUrl = `${environment.apiUrl}/prescriptions`;
  private localStorageKey = 'vitagest_prescriptions';
  private http = inject(HttpClient);

  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(this.apiUrl).pipe(
      catchError((error) => {
        if (this.shouldFallbackToLocal(error)) {
          return of(this.readLocalPrescriptions());
        }
        return this.handleError(error);
      })
    );
  }

  getPrescriptionById(id: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        if (this.shouldFallbackToLocal(error)) {
          const match = this.readLocalPrescriptions().find((item) => item.id === id);
          if (match) {
            return of(match);
          }
        }
        return this.handleError(error);
      })
    );
  }

  getPrescriptionsByClient(clientId: number): Observable<Prescription[]> {
    return this.http
      .get<Prescription[]>(`${this.apiUrl}/client/${clientId}`)
      .pipe(
        catchError((error) => {
          if (this.shouldFallbackToLocal(error)) {
            return of(this.readLocalPrescriptions().filter((item) => item.clientId === clientId));
          }
          return this.handleError(error);
        })
      );
  }

  createPrescription(payload: Prescription): Observable<Prescription> {
    return this.http.post<Prescription>(this.apiUrl, payload).pipe(
      catchError((error) => {
        if (this.shouldFallbackToLocal(error)) {
          return of(this.createLocalPrescription(payload));
        }
        return this.handleError(error);
      })
    );
  }

  updatePrescription(id: number, payload: Prescription): Observable<Prescription> {
    return this.http
      .put<Prescription>(`${this.apiUrl}/${id}`, payload)
      .pipe(
        catchError((error) => {
          if (this.shouldFallbackToLocal(error)) {
            return of(this.updateLocalPrescription(id, payload));
          }
          return this.handleError(error);
        })
      );
  }

  deletePrescription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        if (this.shouldFallbackToLocal(error)) {
          this.deleteLocalPrescription(id);
          return of(void 0);
        }
        return this.handleError(error);
      })
    );
  }

  private shouldFallbackToLocal(error: HttpErrorResponse): boolean {
    // Backend prescriptions endpoint may be missing for now.
    return error.status === 404 || error.status === 500 || error.status === 0;
  }

  private readLocalPrescriptions(): Prescription[] {
    try {
      const raw = localStorage.getItem(this.localStorageKey);
      return raw ? (JSON.parse(raw) as Prescription[]) : [];
    } catch {
      return [];
    }
  }

  private writeLocalPrescriptions(data: Prescription[]): void {
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  private createLocalPrescription(payload: Prescription): Prescription {
    const current = this.readLocalPrescriptions();
    const nextId =
      current.length > 0 ? Math.max(...current.map((item) => item.id ?? 0)) + 1 : 1;
    const created: Prescription = { ...payload, id: nextId };
    this.writeLocalPrescriptions([created, ...current]);
    return created;
  }

  private updateLocalPrescription(id: number, payload: Prescription): Prescription {
    const current = this.readLocalPrescriptions();
    const updated: Prescription = { ...payload, id };
    const next = current.map((item) => (item.id === id ? updated : item));
    this.writeLocalPrescriptions(next);
    return updated;
  }

  private deleteLocalPrescription(id: number): void {
    const current = this.readLocalPrescriptions();
    this.writeLocalPrescriptions(current.filter((item) => item.id !== id));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue avec les ordonnances';
    if (error.status === 404) {
      errorMessage = 'Ordonnance introuvable (404).';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé pour les ordonnances (403).';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Données d’ordonnance invalides.';
    }
    return throwError(() => new Error(errorMessage));
  }
}

