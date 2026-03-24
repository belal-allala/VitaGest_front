export interface Client {
  id?: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  dateNaissance?: string;
  allergies?: string[];
  antecedents?: string;
  pointsFidelite?: number;
  dateDerniereVisite?: string;
}

