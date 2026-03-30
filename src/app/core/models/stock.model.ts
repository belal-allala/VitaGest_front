import { Medicament } from './medicament.model';

export interface Lot {
  id?: number;
  lotId?: string;
  fabrication?: string;
  dateExpiration: string;
  quantite: number;
  medicament?: Medicament;
  medicamentId?: number;
  dateLivraison?: string;
}

// Alias for backward compatibility during refactoring
export type Stock = Lot;
