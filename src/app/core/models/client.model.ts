export interface Client {
  id?: number;
  nom: string;
  prenom: string;
  email?: string;
  tel?: string;
  allergies?: string;
  consentRgpd?: boolean;
}
