export interface Medicament {
  id?: number;
  dci: string;
  nom: string;
  forme?: string;
  dosage?: string;
  prix: number;
  classe?: string;
  codeAtc?: string;
  vignetteUrl?: string;
  formeDosage?: string;
  quantiteEnStock?: number;
}
