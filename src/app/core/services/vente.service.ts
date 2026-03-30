import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Vente } from '../models/vente.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VenteService {
  private apiUrl = `${environment.apiUrl}/ventes`;
  private http = inject(HttpClient);

  constructor() { }

  getAllVentes(): Observable<Vente[]> {
    return this.http.get<Vente[]>(this.apiUrl);
  }

  getVenteById(id: number): Observable<Vente> {
    return this.http.get<Vente>(`${this.apiUrl}/${id}`);
  }

  createVente(vente: Vente): Observable<Vente> {
    return this.http.post<Vente>(this.apiUrl, vente);
  }

  getVentesByClient(clientId: number): Observable<Vente[]> {
    return this.getAllVentes().pipe(
      map(ventes => ventes.filter(v => v.clientId === clientId)),
      catchError(() => of([]))
    );
  }

  getVentesByUser(userId: number): Observable<Vente[]> {
    return this.getAllVentes().pipe(
      map(ventes => ventes.filter(v => v.vendeurId === userId)),
      catchError(() => of([]))
    );
  }
}
