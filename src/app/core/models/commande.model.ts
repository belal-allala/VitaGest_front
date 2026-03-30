import { Fournisseur } from './fournisseur.model';
import { Medicament } from './medicament.model';

export type CommandeStatus = 'BROUILLON' | 'EN_ATTENTE' | 'RECUE';

export interface CommandeLigne {
  id?: number;
  quantite: number;
  prixAchat: number;
  dateExpiration: string;
  medicamentId: number;
  medicament?: Medicament;
}

export interface Commande {
  id?: number;
  date?: string;
  statut: CommandeStatus;
  totalAmount?: number;
  fournisseurId: number;
  fournisseur?: Fournisseur;
  lignes: CommandeLigne[];
}
