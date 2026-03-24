import { Fournisseur } from './fournisseur.model';
import { Medicament } from './medicament.model';

export type CommandeStatus = 'BROUILLON' | 'EN_ATTENTE' | 'RECUE';

export interface CommandeItem {
  id?: number;
  medicamentId: number;
  medicament?: Medicament;
  quantite: number;
  prixAchat: number;
  dateExpiration: string;
}

export interface Commande {
  id?: number;
  fournisseurId: number;
  fournisseur?: Fournisseur;
  items: CommandeItem[];
  statut: CommandeStatus;
  totalAmount?: number;
  dateCommande?: string;
}
