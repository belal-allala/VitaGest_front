import { Medicament } from './medicament.model';
import { Client } from './client.model';

export interface VenteItem {
  id?: number;
  medicamentId: number;
  medicament?: Medicament;
  quantite: number;
  prixUnitaire: number;
}

export interface Vente {
  id?: number;
  clientId?: number;
  client?: Client;
  utilisateurId?: number;
  items: VenteItem[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  dateVente?: string;
}
