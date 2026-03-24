import { Medicament } from './medicament.model';

export interface Stock {
  id?: number;
  lotId?: string;
  quantite: number;
  dateExpiration: string;
  dateLivraison: string;
  medicamentId?: number;
  medicament?: Medicament;
}
