export type AuditActionType = 'CREATION' | 'MODIFICATION' | 'DELETION' | 'PRICE_CHANGE' | 'STOCK_ADJUSTMENT' | 'LOGIN' | 'SYSTEM_ERROR';

export interface AuditLog {
  id?: number;
  dateAction: string;
  actionType: AuditActionType;
  entiteCible: string; // e.g., "Medicament", "User", "Commande"
  acteurId?: number;
  acteurEmail: string;
  details: string;
  ipAddress?: string;
}
