import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Stock } from '../../../core/models/stock.model';
import { StockService } from '../../../core/services/stock.service';
import { AuthService } from '../../../core/services/auth.service';

type StockFilter = 'ALL' | 'EXPIRED' | 'LOW' | 'NEAR_EXPIRY';

interface StockPageState {
  loading: boolean;
  error: string | null;
  stocks: Stock[];
}

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css',
})
export class StockListComponent {
  private readonly stockService = inject(StockService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isAdmin = signal(false);

  constructor() {
    this.isAdmin.set(this.authService.isAdmin());
  }

  private readonly refreshTick = signal(0);
  readonly searchTerm = signal('');
  readonly activeFilter = signal<StockFilter>('ALL');
  readonly showAdjustModal = signal(false);
  readonly selectedStock = signal<Stock | null>(null);
  readonly isSubmittingAdjust = signal(false);
  readonly toast = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  readonly adjustForm = this.fb.group({
    quantite: [0, [Validators.required]],
    motif: ['', [Validators.required, Validators.minLength(5)]],
  });

  private readonly initialState: StockPageState = {
    loading: true,
    error: null,
    stocks: [],
  };

  readonly state = toSignal(
    toObservable(this.refreshTick).pipe(
      switchMap(() =>
        this.stockService.getAllStocks().pipe(
          map((stocks): StockPageState => ({ loading: false, error: null, stocks })),
          startWith(this.initialState),
          catchError((error) =>
            of({
              loading: false,
              error: error instanceof Error ? error.message : 'Impossible de charger le stock.',
              stocks: [],
            })
          )
        )
      )
    ),
    { initialValue: this.initialState }
  );

  readonly stocksSorted = computed(() => {
    return [...this.state().stocks].sort((a, b) => {
      const aTime = new Date(a.dateExpiration).getTime();
      const bTime = new Date(b.dateExpiration).getTime();
      return aTime - bTime;
    });
  });

  readonly totalInventoryValue = computed(() => {
    return this.state().stocks.reduce(
      (sum, stock) => sum + stock.quantite * (stock.medicament?.prix ?? 0),
      0
    );
  });

  readonly expiredBatches = computed(() => {
    const today = this.startOfDay(new Date());
    return this.state().stocks.filter((stock) => this.startOfDay(new Date(stock.dateExpiration)) < today)
      .length;
  });

  readonly lowStockAlerts = computed(() => {
    return this.state().stocks.filter((stock) => stock.quantite < 10).length;
  });

  readonly nearExpiryBatches = computed(() => {
    const today = this.startOfDay(new Date());
    const in90Days = this.startOfDay(new Date());
    in90Days.setDate(in90Days.getDate() + 90);
    return this.state().stocks.filter((stock) => {
      const expiration = this.startOfDay(new Date(stock.dateExpiration));
      return expiration >= today && expiration <= in90Days;
    }).length;
  });

  readonly filteredStocks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filter = this.activeFilter();

    let data = this.stocksSorted();

    if (term) {
      data = data.filter((stock) => {
        const name = stock.medicament?.nom?.toLowerCase() ?? '';
        const lotId = stock.lotId?.toLowerCase() ?? '';
        return name.includes(term) || lotId.includes(term);
      });
    }

    if (filter === 'EXPIRED') {
      return data.filter((stock) => this.getStockStatus(stock) === 'EXPIRED');
    }
    if (filter === 'LOW') {
      return data.filter((stock) => stock.quantite < 10);
    }
    if (filter === 'NEAR_EXPIRY') {
      return data.filter((stock) => this.getStockStatus(stock) === 'NEAR_EXPIRY');
    }
    return data;
  });

  refresh(): void {
    this.refreshTick.update((value) => value + 1);
  }

  setFilter(filter: StockFilter): void {
    this.activeFilter.set(filter);
  }

  getStockValue(stock: Stock): number {
    return stock.quantite * (stock.medicament?.prix ?? 0);
  }

  getStockStatus(stock: Stock): 'EXPIRED' | 'LOW' | 'NEAR_EXPIRY' | 'OK' {
    const today = this.startOfDay(new Date());
    const expiration = this.startOfDay(new Date(stock.dateExpiration));

    if (expiration < today) {
      return 'EXPIRED';
    }

    const in90Days = this.startOfDay(new Date());
    in90Days.setDate(in90Days.getDate() + 90);

    if (stock.quantite < 10) {
      return 'LOW';
    }
    if (expiration <= in90Days) {
      return 'NEAR_EXPIRY';
    }
    return 'OK';
  }

  getStatusClass(stock: Stock): string {
    const status = this.getStockStatus(stock);
    if (status === 'EXPIRED') {
      return 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle';
    }
    if (status === 'LOW') {
      return 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    }
    if (status === 'NEAR_EXPIRY') {
      return 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    }
    return 'badge bg-success-subtle text-success-emphasis border border-success-subtle';
  }

  getStatusLabel(stock: Stock): string {
    const status = this.getStockStatus(stock);
    if (status === 'EXPIRED') {
      return 'Expiré';
    }
    if (status === 'LOW') {
      return 'Stock bas';
    }
    if (status === 'NEAR_EXPIRY') {
      return 'Proche expiration';
    }
    return 'OK';
  }

  openAdjustModal(stock: Stock): void {
    this.selectedStock.set(stock);
    this.adjustForm.reset({
      quantite: stock.quantite,
      motif: '',
    });
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
    this.selectedStock.set(null);
  }

  submitAdjust(): void {
    if (this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      return;
    }

    const selected = this.selectedStock();
    if (!selected?.id) {
      return;
    }

    const quantite = Number(this.adjustForm.value.quantite ?? 0);
    const motif = String(this.adjustForm.value.motif ?? '');

    this.isSubmittingAdjust.set(true);
    this.stockService.adjustStockLot(selected.id, quantite, motif).subscribe({
      next: () => {
        this.isSubmittingAdjust.set(false);
        this.closeAdjustModal();
        this.refresh();
        this.showToast('success', 'Ajustement du lot enregistré avec succès.');
      },
      error: (error) => {
        this.isSubmittingAdjust.set(false);
        this.showToast('danger', error instanceof Error ? error.message : 'Échec de l’ajustement.');
      },
    });
  }

  private showToast(type: 'success' | 'danger', text: string): void {
    this.toast.set({ type, text });
    setTimeout(() => this.toast.set(null), 3500);
  }

  private startOfDay(date: Date): Date {
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

