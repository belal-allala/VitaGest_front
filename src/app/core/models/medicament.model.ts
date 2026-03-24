export interface Medicament {
  id?: number;
  nom: string;
  dci: string;
  formeDosage: string;
  classe: string;
  prix: number;
  quantiteEnStock?: number;
}
