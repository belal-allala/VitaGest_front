import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuditLog } from '../models/audit.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = `${environment.apiUrl}/audit-logs`;
  private http = inject(HttpClient);

  constructor() { }

  getAllAudits(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Impossible de contacter le service d\'audit.';
    if (error.status === 403) {
      errorMessage = 'Accès aux logs d\'audit refusé. Rôle Administrateur requis.';
    }
    console.error('Audit API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
