import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../models/client.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients`;
  private http = inject(HttpClient);

  constructor() { }

  getAllClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  createClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  updateClient(id: number, client: Client): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, client);
  }

  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

