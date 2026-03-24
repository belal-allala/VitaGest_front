import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Stock } from '../models/stock.model';
import { environment } from '../../../environments/environment';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  // Backend exposes /lots (not /stocks)
  private apiUrl = `${environment.apiUrl}/lots`;
  private http = inject(HttpClient);

  constructor() { }

  getAllStocks(): Observable<Stock[]> {
    return this.http.get<Stock[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getStockByLot(lotId: string): Observable<Stock> {
    // Fallback implementation compatible with current backend endpoints.
    return this.getAllStocks().pipe(
      map((stocks) => {
        const stock = stocks.find((item) => item.lotId === lotId);
        if (!stock) {
          throw new Error('Lot introuvable.');
        }
        return stock;
      }),
      catchError(this.handleError)
    );
  }

  getStockById(id: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  getStocksByMedicament(medicamentId: number): Observable<Stock[]> {
    // Fallback implementation compatible with current backend endpoints.
    return this.getAllStocks().pipe(
      map((stocks) => stocks.filter((stock) => stock.medicamentId === medicamentId)),
      catchError(this.handleError)
    );
  }

  createStock(stock: Stock): Observable<Stock> {
    return this.http.post<Stock>(this.apiUrl, stock).pipe(catchError(this.handleError));
  }

  updateStock(id: number, stock: Stock): Observable<Stock> {
    return this.http.put<Stock>(`${this.apiUrl}/${id}`, stock).pipe(catchError(this.handleError));
  }
  
  deleteStock(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  adjustStockLot(id: number, quantite: number, motif: string): Observable<Stock> {
    // Backend currently exposes CRUD endpoints; adjustment is done via PUT.
    // `motif` remains mandatory in UI for audit traceability workflow.
    return this.getStockById(id).pipe(
      switchMap((currentStock) => {
        const payload: Stock = {
          ...currentStock,
          quantite,
        };
        return this.http.put<Stock>(`${this.apiUrl}/${id}`, payload);
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue avec le stock';
    if (error.status === 404) {
      errorMessage = 'Stock introuvable (404).';
    } else if (error.status === 403) {
      errorMessage = 'Accès refusé pour gérer le stock (403).';
    } else if (error.status === 400) {
      errorMessage = 'Données de stock invalides.';
    }
    console.error('Stock API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
