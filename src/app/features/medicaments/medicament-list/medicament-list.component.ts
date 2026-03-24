import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MedicamentService } from '../../../core/services/medicament.service';
import { StockService } from '../../../core/services/stock.service';
import { AuthService } from '../../../core/services/auth.service';
import { Medicament } from '../../../core/models/medicament.model';
import { Stock } from '../../../core/models/stock.model';

@Component({
  selector: 'app-medicament-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './medicament-list.component.html',
  styleUrls: ['./medicament-list.component.css']
})
export class MedicamentListComponent implements OnInit {
  // Signals Strategy
  medicaments = signal<Medicament[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);
  isAdmin = signal<boolean>(false);
  globalError = signal<string | null>(null);

  // Computed Values
  filteredMedicaments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const meds = this.medicaments();
    if (!term) return meds;
    return meds.filter(m => m.nom.toLowerCase().includes(term) || m.dci.toLowerCase().includes(term));
  });

  // Services
  private medicamentService = inject(MedicamentService);
  private stockService = inject(StockService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Modals Data
  selectedMedicamentStocks = signal<Stock[]>([]);
  selectedMedicamentName = signal<string>('');
  medicamentForm: FormGroup;
  isEditMode = signal<boolean>(false);
  currentMedicamentId = signal<number | null>(null);
  medicamentToDelete = signal<Medicament | null>(null);

  // Stock Adjustment Data
  stockAdjustForm: FormGroup;
  selectedStockForAdjust = signal<Stock | null>(null);
  isSubmittingAdjust = signal<boolean>(false);

  // Notification Toast (Optional advanced UX approach, primitive version here for demo)
  toastMessage = signal<{text: string, type: 'success' | 'danger'} | null>(null);

  constructor() {
    this.medicamentForm = this.fb.group({
      nom: ['', Validators.required],
      dci: ['', Validators.required],
      formeDosage: ['', Validators.required],
      classe: ['', Validators.required],
      prix: [0, [Validators.required, Validators.min(0.01)]]
    });

    this.stockAdjustForm = this.fb.group({
      quantite: [0, [Validators.required]], // Can be negative or positive depending on UI approach, but minimum a valid integer
      motif: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.isAdmin.set(this.authService.isAdmin());
    this.loadMedicaments();
  }

  loadMedicaments() {
    this.isLoading.set(true);
    this.globalError.set(null);
    this.medicamentService.getAllMedicaments().subscribe({
      next: (data) => {
        this.medicaments.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.globalError.set(err.message || 'Impossible de charger les médicaments.');
        this.isLoading.set(false);
        this.showToast('Erreur serveur: ' + (err.message || 'Serveur injoignable'), 'danger');
      }
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
  }

  // --- Stock Modal logic ---
  viewStock(medicament: Medicament) {
    this.selectedMedicamentStocks.set([]);
    this.selectedMedicamentName.set(medicament.nom);
    if (medicament.id) {
      this.stockService.getStocksByMedicament(medicament.id).subscribe({
        next: (stocks) => {
          this.selectedMedicamentStocks.set(stocks);
        },
        error: (err) => this.showToast('Erreur lors du chargement des stocks.', 'danger')
      });
    }
  }

  // Stock Calculation utility
  isExpiringSoon(dateStr: string): boolean {
    const expirationDate = new Date(dateStr);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expirationDate <= threeMonthsFromNow;
  }

  openAdjustModal(stock: Stock) {
    // We can assume quantite here represents the NEW total quantity or the difference.
    // Let's assume it sets the NEW absolute quantity, depending on backend implementation.
    // Generally "adjust" means the final quantite or diff. Let's provide the current as default.
    this.selectedStockForAdjust.set(stock);
    this.stockAdjustForm.reset({
      quantite: stock.quantite,
      motif: ''
    });
  }

  onSubmitAdjustStock() {
     if (this.stockAdjustForm.invalid) {
        this.stockAdjustForm.markAllAsTouched();
        return;
     }

     const stock = this.selectedStockForAdjust();
     if (!stock?.id) return;

     this.isSubmittingAdjust.set(true);
     const { quantite, motif } = this.stockAdjustForm.value;

     this.stockService.adjustStockLot(stock.id, quantite, motif).subscribe({
        next: () => {
           this.isSubmittingAdjust.set(false);
           this.showToast('Lot ajusté et tracé avec succès.', 'success');
           this.closeModal('adjustStockModal');
           this.selectedStockForAdjust.set(null);
           
           // Refresh the modal view representing the current medicament stock
           const medId = this.currentMedicamentId() || this.medicaments().find(m => m.nom === this.selectedMedicamentName())?.id;
           if (medId) {
              this.stockService.getStocksByMedicament(medId).subscribe(stocks => this.selectedMedicamentStocks.set(stocks));
           }
           this.loadMedicaments(); // Refresh global table stocks too
        },
        error: (err) => {
           this.isSubmittingAdjust.set(false);
           this.showToast(err.message || 'Échec de l\'ajustement.', 'danger');
        }
     });
  }

  // --- Add/Edit logic ---
  openAddModal() {
    this.isEditMode.set(false);
    this.currentMedicamentId.set(null);
    this.medicamentForm.reset({ prix: 0 });
  }

  openEditModal(medicament: Medicament) {
    this.isEditMode.set(true);
    this.currentMedicamentId.set(medicament.id || null);
    this.medicamentForm.patchValue({
      nom: medicament.nom,
      dci: medicament.dci,
      formeDosage: medicament.formeDosage,
      classe: medicament.classe,
      prix: medicament.prix
    });
  }

  onSubmitMedicament() {
    if (this.medicamentForm.invalid) {
      this.medicamentForm.markAllAsTouched();
      return;
    }

    const medData: Medicament = this.medicamentForm.value;
    const currentId = this.currentMedicamentId();

    if (this.isEditMode() && currentId) {
      medData.id = currentId;
      this.medicamentService.updateMedicament(currentId, medData).subscribe({
        next: () => {
          this.loadMedicaments();
          this.closeModal('addEditMedicamentModal');
          this.showToast('Médicament mis à jour avec succès.', 'success');
        },
        error: (err) => this.showToast('Échec de la mise à jour.', 'danger')
      });
    } else {
      this.medicamentService.createMedicament(medData).subscribe({
        next: () => {
          this.loadMedicaments();
          this.closeModal('addEditMedicamentModal');
          this.showToast('Médicament ajouté avec succès.', 'success');
        },
        error: (err) => this.showToast('Échec de la création.', 'danger')
      });
    }
  }

  // --- Delete logic ---
  confirmDelete(medicament: Medicament) {
    this.medicamentToDelete.set(medicament);
  }

  executeDelete() {
    const med = this.medicamentToDelete();
    if (med && med.id) {
      this.medicamentService.deleteMedicament(med.id).subscribe({
        next: () => {
          this.loadMedicaments();
          this.medicamentToDelete.set(null);
          this.closeModal('deleteConfirmModal');
          this.showToast('Médicament supprimé définitivement.', 'success');
        },
        error: (err) => {
          this.closeModal('deleteConfirmModal');
          this.showToast(err.message || 'Échec de la suppression.', 'danger');
        }
      });
    }
  }

  showToast(text: string, type: 'success' | 'danger') {
    this.toastMessage.set({text, type});
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  private closeModal(modalId: string) {
    if (typeof document !== 'undefined') {
      const modalInstance = document.getElementById(modalId);
      if (modalInstance) {
        const closeBtn = modalInstance.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
        if (closeBtn) {
          closeBtn.click();
        }
      }
    }
  }
}
