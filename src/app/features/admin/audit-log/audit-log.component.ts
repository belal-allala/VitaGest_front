import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../core/services/audit.service';
import { AuditLog, AuditActionType } from '../../../core/models/audit.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.css']
})
export class AuditLogComponent implements OnInit {
  // Signals Strategy
  audits = signal<AuditLog[]>([]);
  searchTerm = signal<string>('');
  filterType = signal<string>('ALL');
  isLoading = signal<boolean>(true);
  globalError = signal<string | null>(null);

  // Computed Values
  filteredAudits = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const type = this.filterType();
    let currentAudits = this.audits();

    if (type !== 'ALL') {
      currentAudits = currentAudits.filter((a: AuditLog) => a.action === type);
    }

    if (!term) return currentAudits;

    return currentAudits.filter((a: AuditLog) => 
      (a.userName || '').toLowerCase().includes(term) || 
      (a.entity || '').toLowerCase().includes(term) ||
      (a.details || '').toLowerCase().includes(term)
    );
  });

  private auditService = inject(AuditService);

  ngOnInit(): void {
    this.loadAudits();
  }

  loadAudits() {
    this.isLoading.set(true);
    this.globalError.set(null);
    this.auditService.getAllAudits().subscribe({
      next: (data: AuditLog[]) => {
        // Sort newest first by ID assumed loosely
        this.audits.set(data.sort((a: AuditLog, b: AuditLog) => (b.id || 0) - (a.id || 0)));
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.globalError.set(err.message || 'Impossible de charger la boîte noire des audits.');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
  }

  onFilter(type: string) {
    this.filterType.set(type);
  }

  getActionBadgeClass(action: string): string {
    const a = (action || '').toUpperCase();
    if (a.includes('DELETE') || a.includes('DELETION')) {
      return 'bg-danger text-white px-2 py-1 rounded fw-bold small';
    }
    if (a.includes('PRICE_CHANGE')) {
      return 'bg-warning text-dark px-2 py-1 rounded fw-bold small';
    }
    if (a.includes('STOCK_ADJUSTMENT')) {
      return 'bg-info text-dark px-2 py-1 rounded fw-bold small';
    }
    if (a.includes('LOGIN')) {
      return 'bg-light text-muted border px-2 py-1 rounded small fw-medium';
    }
    if (a.includes('UPDATE') || a.includes('MODIFICATION') || a.includes('VALIDATION') || a.includes('RECEPTION')) {
      return 'bg-primary bg-opacity-10 text-primary border px-2 py-1 rounded small fw-medium';
    }
    if (a.includes('CREATE') || a.includes('CREATION')) {
      return 'bg-success bg-opacity-10 text-success border px-2 py-1 rounded small fw-medium';
    }
    return 'bg-secondary bg-opacity-10 text-secondary border px-2 py-1 rounded small fw-medium';
  }
}
