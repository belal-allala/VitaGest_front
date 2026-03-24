export type PrescriptionStatus = 'ACTIVE' | 'EXPIRED' | 'USED';

export interface PrescriptionItem {
  id?: number;
  medicamentId: number;
  medicamentName?: string;
  dosage: string;
  duration: string;
  frequency: string;
}

export interface Prescription {
  id?: number;
  clientId: number;
  doctorName: string;
  doctorRegistrationNumber?: string;
  datePrescription: string;
  validityDate: string;
  items: PrescriptionItem[];
  scannedImageUrl?: string;
  status: PrescriptionStatus;
}

