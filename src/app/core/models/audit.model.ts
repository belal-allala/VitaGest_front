export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'PRICE_CHANGE' | 'STOCK_ADJUSTMENT' | 'LOGIN' | 'SYSTEM_ERROR' | string;

export interface AuditLog {
  id?: number;
  timestamp: string; // was dateAction
  action: AuditActionType; // was actionType
  entity: string; // was entiteCible
  userId?: number; // was acteurId
  userName: string; // was acteurEmail
  details: string;
  ipAddress?: string;
}
