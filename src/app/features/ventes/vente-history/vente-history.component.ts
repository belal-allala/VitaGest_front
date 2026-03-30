import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VenteService } from '../../../core/services/vente.service';
import { Vente, VenteLigne } from '../../../core/models/vente.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-vente-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vente-history.component.html',
  styleUrls: ['./vente-history.component.css']
})
export class VenteHistoryComponent implements OnInit {
  private venteService = inject(VenteService);

  ventes = signal<Vente[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedDate = signal('');

  private authService = inject(AuthService);

  // Modal State
  selectedVente = signal<Vente | null>(null);
  showModal = signal(false);

  filteredVentes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const date = this.selectedDate();
    const currentUser = this.authService.currentUserValue;
    const isAdmin = this.authService.isAdmin();

    return this.ventes().filter(v => {
      // 1. User Filter
      const userId = currentUser && (currentUser as any).userId;
      const isMine = !userId || v.vendeurId === userId;
      
      if (!isAdmin && !isMine) return false;

      // 2. Search Query
      const qLower = q.toLowerCase();
      const matchesSearch = !q || (
        v.id?.toString().includes(qLower) || 
        (v.client?.nom?.toLowerCase().includes(qLower)) ||
        (v.client?.prenom?.toLowerCase().includes(qLower))
      );

      // 3. Date Filter
      const saleDate = v.dateVente ? v.dateVente.substring(0, 10) : '';
      const matchesDate = !date || saleDate === date;

      return matchesSearch && matchesDate;
    });
  });

  totalRevenue = computed(() => {
    return this.filteredVentes().reduce((sum, v) => sum + (v.total || 0), 0);
  });

  ngOnInit(): void {
    this.loadVentes();
  }

  loadVentes(): void {
    this.isLoading.set(true);
    this.venteService.getAllVentes().subscribe({
      next: (data) => {
        // Sort by date descending
        const sorted = data.sort((a, b) => {
          const d1 = new Date(a.dateVente || '').getTime();
          const d2 = new Date(b.dateVente || '').getTime();
          return d2 - d1;
        });
        this.ventes.set(sorted);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l\'historique', err);
        this.isLoading.set(false);
      }
    });
  }

  viewDetails(vente: Vente): void {
    this.selectedVente.set(vente);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedVente.set(null);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }
}
