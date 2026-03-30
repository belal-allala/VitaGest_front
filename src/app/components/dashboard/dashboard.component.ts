import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';

Chart.register(...registerables);
import { catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Commande } from '../../core/models/commande.model';
import { Medicament } from '../../core/models/medicament.model';
import { Stock } from '../../core/models/stock.model';
import { Vente } from '../../core/models/vente.model';
import { CommandeService } from '../../core/services/commande.service';
import { MedicamentService } from '../../core/services/medicament.service';
import { StockService } from '../../core/services/stock.service';
import { VenteService } from '../../core/services/vente.service';

interface DashboardState {
  loading: boolean;
  error: string | null;
  ventes: Vente[];
  medicaments: Medicament[];
  stocks: Stock[];
  commandes: Commande[];
}

interface TopSellingItem {
  name: string;
  quantitySold: number;
  revenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, CurrencyPipe, DecimalPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly venteService = inject(VenteService);
  private readonly medicamentService = inject(MedicamentService);
  private readonly stockService = inject(StockService);
  private readonly commandeService = inject(CommandeService);

  private readonly refreshTick = signal(0);

  private readonly emptyState: DashboardState = {
    loading: true,
    error: null,
    ventes: [],
    medicaments: [],
    stocks: [],
    commandes: [],
  };

  readonly state = toSignal(
    toObservable(this.refreshTick).pipe(
      switchMap(() =>
        this.fetchDashboardData().pipe(
          map((data): DashboardState => ({ loading: false, error: null, ...data })),
          startWith(this.emptyState),
          catchError((error) =>
            of({
              ...this.emptyState,
              loading: false,
              error: this.resolveErrorMessage(error),
            })
          )
        )
      )
    ),
    { initialValue: this.emptyState }
  );

  readonly ventes = computed(() => this.state().ventes);
  readonly medicaments = computed(() => this.state().medicaments);

  // Robust Stock enrichment: merge stock data with medicament info if missing
  readonly stocks = computed(() => {
    const meds = this.medicaments();
    return this.state().stocks.map(stock => {
      if (!stock.medicament && stock.medicamentId && meds.length > 0) {
        const found = meds.find(m => m.id === stock.medicamentId);
        if (found) {
          return { ...stock, medicament: found };
        }
      }
      return stock;
    });
  });

  readonly totalRevenue = computed(() =>
    this.ventes().reduce((sum, vente) => sum + (vente.total ?? 0), 0)
  );

  readonly transactionCount = computed(() => this.ventes().length);

  readonly totalInventoryValue = computed(() => {
    return this.stocks().reduce(
      (sum, stock) => sum + (stock.quantite ?? 0) * (stock.medicament?.prix ?? 0),
      0
    );
  });

  readonly pendingOrders = computed(() => {
    return this.state().commandes.filter(c => c.statut === 'EN_ATTENTE').length;
  });

  readonly expiredStockList = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.stocks().filter((s) => new Date(s.dateExpiration) < now);
  });

  readonly nearExpiryList = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const inNinetyDays = new Date(now);
    inNinetyDays.setDate(now.getDate() + 90);
    return this.stocks().filter((s) => {
      const exp = new Date(s.dateExpiration);
      return exp >= now && exp <= inNinetyDays;
    });
  });

  readonly lowStockList = computed(() => {
    return this.stocks().filter((s) => (s.quantite ?? 0) < 10 && (s.quantite ?? 0) > 0);
  });

  readonly emptyStockList = computed(() => {
    return this.stocks().filter((s) => (s.quantite ?? 0) === 0);
  });

  readonly salesTrendData = computed<ChartData<'line'>>(() => {
    // Sort sales by date first
    const sortedVentes = [...this.ventes()].sort((a, b) => {
      const aTime = a.dateVente ? new Date(a.dateVente).getTime() : 0;
      const bTime = b.dateVente ? new Date(b.dateVente).getTime() : 0;
      return aTime - bTime;
    });

    const revenueByDate = new Map<string, number>();
    for (const vente of sortedVentes) {
      const label = this.toDateLabel(vente.dateVente);
      revenueByDate.set(label, (revenueByDate.get(label) ?? 0) + (vente.total ?? 0));
    }

    const labels = Array.from(revenueByDate.keys());
    return {
      labels,
      datasets: [
        {
          label: 'Chiffre d’affaires',
          data: labels.map((label) => revenueByDate.get(label) ?? 0),
          fill: true,
          tension: 0.35,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.18)',
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointHoverRadius: 6,
        },
      ],
    };
  });

  readonly stockDistributionData = computed<ChartData<'doughnut'>>(() => {
    const classByMedicamentId = new Map<number, string>();
    for (const medicament of this.medicaments()) {
      if (medicament.id) {
        classByMedicamentId.set(medicament.id, medicament.classe || 'Non classé');
      }
    }

    const quantityByClass = new Map<string, number>();
    for (const stock of this.stocks()) {
      const fallbackClass = stock.medicament?.classe || 'Non classé';
      const classe = stock.medicamentId
        ? classByMedicamentId.get(stock.medicamentId) || fallbackClass
        : fallbackClass;
      quantityByClass.set(classe, (quantityByClass.get(classe) ?? 0) + (stock.quantite ?? 0));
    }

    const labels = Array.from(quantityByClass.keys());
    return {
      labels,
      datasets: [
        {
          data: labels.map((label) => quantityByClass.get(label) ?? 0),
          backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'],
          borderWidth: 1,
          borderColor: '#ffffff',
        },
      ],
    };
  });

  readonly topSellingMedicines = computed<TopSellingItem[]>(() => {
    const medicamentById = new Map<number, string>();
    for (const medicament of this.medicaments()) {
      if (medicament.id) {
        medicamentById.set(medicament.id, medicament.nom);
      }
    }

    const stats = new Map<number, TopSellingItem>();

    for (const vente of this.ventes()) {
      for (const item of vente.lignes ?? []) {
        const key = item.medicamentId;
        const existing = stats.get(key);
        const itemRevenue = (item.quantite ?? 0) * (item.prixUnitaire ?? 0);
        if (existing) {
          existing.quantitySold += item.quantite ?? 0;
          existing.revenue += itemRevenue;
          continue;
        }
        stats.set(key, {
          name: item.medicament?.nom || medicamentById.get(key) || `Médicament #${key}`,
          quantitySold: item.quantite ?? 0,
          revenue: itemRevenue,
        });
      }
    }

    return Array.from(stats.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);
  });

  readonly recentTransactions = computed(() => {
    return [...this.ventes()]
      .sort((a, b) => {
        const aTime = a.dateVente ? new Date(a.dateVente).getTime() : 0;
        const bTime = b.dateVente ? new Date(b.dateVente).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  });

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  readonly doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  refreshDashboard(): void {
    this.refreshTick.update((value) => value + 1);
  }

  private fetchDashboardData() {
    return forkJoin({
      ventes: this.venteService.getAllVentes().pipe(catchError(() => of([] as Vente[]))),
      medicaments: this.medicamentService
        .getAllMedicaments()
        .pipe(catchError(() => of([] as Medicament[]))),
      stocks: this.stockService.getAllStocks().pipe(catchError(() => of([] as Stock[]))),
      commandes: this.commandeService.getAllCommandes().pipe(catchError(() => of([] as Commande[]))),
    });
  }

  private toDateLabel(date?: string): string {
    if (!date) {
      return 'N/A';
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }
    return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Impossible de charger les données du tableau de bord.';
  }
}

