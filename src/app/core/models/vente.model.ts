import { Medicament } from './medicament.model';
import { Client } from './client.model';

export interface VenteLigne {
  id?: number;
  quantite: number;
  prixUnitaire?: number;
  remise?: number;
  medicamentId: number;
  medicament?: Medicament;
}

export interface Vente {
  id?: number;
  dateVente?: string;
  total?: number;
  mode: string;
  clientId?: number;
  client?: Client;
  vendeurId?: number;
  lignes: VenteLigne[];
}
