import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommandeService } from '../../../core/services/commande.service';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { MedicamentService } from '../../../core/services/medicament.service';
import { AuthService } from '../../../core/services/auth.service';
import { Commande, CommandeStatus, CommandeLigne } from '../../../core/models/commande.model';
import { Fournisseur } from '../../../core/models/fournisseur.model';
import { Medicament } from '../../../core/models/medicament.model';

@Component({
  selector: 'app-commande-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [CurrencyPipe],
  templateUrl: './commande-list.component.html',
  styleUrls: ['./commande-list.component.css']
})
export class CommandeListComponent implements OnInit {
  // Signals Strategy
  commandes = signal<Commande[]>([]);
  fournisseurs = signal<Fournisseur[]>([]);
  medicaments = signal<Medicament[]>([]);
  
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);
  isAdmin = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  globalError = signal<string | null>(null);
  formTotal = signal<number>(0);
  today = new Date();

  // Computed Values
  filteredCommandes = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allCmds = this.commandes();
    if (!term) return allCmds;
    return allCmds.filter(c => 
      (c.fournisseur?.nom?.toLowerCase().includes(term)) || 
      (c.id?.toString().includes(term))
    );
  });

  // UX Signals
  toastMessage = signal<{text: string, type: 'success' | 'danger'} | null>(null);
  selectedCommandeForView = signal<Commande | null>(null);

  private commandeService = inject(CommandeService);
  private fournisseurService = inject(FournisseurService);
  private medicamentService = inject(MedicamentService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  commandeForm: FormGroup;

  constructor() {
    this.commandeForm = this.fb.group({
      fournisseurId: [null, Validators.required],
      items: this.fb.array([])
    });

    // Listen for form value changes to update totals
    this.commandeForm.get('items')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  calculateTotal() {
    const items = this.itemsFormArray.value;
    const total = items.reduce((sum: number, item: any) => {
      return sum + ((item.quantite || 0) * (item.prixAchat || 0));
    }, 0);
    this.formTotal.set(total);
  }

  getLineTotal(index: number): number {
    const item = this.itemsFormArray.at(index).value;
    return (item.quantite || 0) * (item.prixAchat || 0);
  }

  ngOnInit() {
    this.isAdmin.set(this.authService.isAdmin());
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.commandeService.getAllCommandes().subscribe({
      next: (data) => {
        // Reverse array to show newest first generally (if not sorted by backend)
        this.commandes.set(data.sort((a, b) => (b.id || 0) - (a.id || 0)));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.globalError.set('Impossible de charger les commandes.');
        this.isLoading.set(false);
      }
    });

    if (this.isAdmin()) {
      this.fournisseurService.getAllFournisseurs().subscribe({
        next: (f) => this.fournisseurs.set(f)
      });
      this.medicamentService.getAllMedicaments().subscribe({
        next: (m) => this.medicaments.set(m)
      });
    }
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
  }

  // --- Dynamic Form Logic ---
  get itemsFormArray(): FormArray {
    return this.commandeForm.get('items') as FormArray;
  }

  openNewCommandeModal() {
    this.commandeForm.reset();
    this.itemsFormArray.clear();
    this.addItem(); // Start with at least one item
  }

  addItem() {
    const itemGroup = this.fb.group({
      medicamentId: [null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prixAchat: [0, [Validators.required, Validators.min(0)]],
      dateExpiration: ['', Validators.required]
    });
    this.itemsFormArray.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  onSubmitCommande() {
    if (this.commandeForm.invalid) {
      this.commandeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.commandeForm.value;
    
    // Explicitly map Form array (items) to Backend DTO (lignes)
    const payload: Commande = {
      fournisseurId: formValue.fournisseurId,
      statut: 'EN_ATTENTE',
      lignes: formValue.items
    };

    this.commandeService.createCommande(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.loadData();
        this.closeModal('newCommandeModal');
        this.showToast('La commande a été créée avec succès.', 'success');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.message || 'Erreur lors de la création de la commande.', 'danger');
      }
    });
  }

  // --- Validation Logic ---
  validerCommande(id: number | undefined) {
    if (!id) return;
    this.commandeService.validerCommande(id).subscribe({
      next: () => {
        this.loadData();
        this.showToast('La commande est passée en statut EN ATTENTE.', 'success');
      },
      error: (err) => this.showToast(err.message || 'Erreur lors de la validation.', 'danger')
    });
  }

  // --- Reception Logic ---
  recevoirCommande(id: number | undefined) {
    if (!id) return;

    this.commandeService.recevoirCommande(id).subscribe({
      next: () => {
        this.loadData();
        this.showToast('Commande réceptionnée. Le stock a été mis à jour avec les nouveaux lots.', 'success');
      },
      error: (err) => {
        this.showToast(err.message || 'Erreur lors de la réception de la commande.', 'danger');
      }
    });
  }

  viewDetails(cmd: Commande) {
    this.selectedCommandeForView.set(cmd);
  }

  // --- Utility ---
  getStatusBadgeClass(statut: string): string {
    switch (statut) {
      case 'BROUILLON': return 'status-badge status-brouillon';
      case 'EN_ATTENTE': return 'status-badge status-en_attente';
      case 'RECUE': return 'status-badge status-recue';
      default: return 'status-badge status-brouillon';
    }
  }

  getStepState(statut: string, step: string): 'active' | 'completed' | 'pending' {
    const statuses = ['BROUILLON', 'EN_ATTENTE', 'RECUE'];
    const currentIdx = statuses.indexOf(statut);
    const stepIdx = statuses.indexOf(step);

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'active';
    return 'pending';
  }

  getConnectorState(statut: string, stepBefore: string, stepAfter: string): 'completed' | 'active' | 'pending' {
    const statuses = ['BROUILLON', 'EN_ATTENTE', 'RECUE'];
    const currentIdx = statuses.indexOf(statut);
    const beforeIdx = statuses.indexOf(stepBefore);
    const afterIdx = statuses.indexOf(stepAfter);

    if (currentIdx >= afterIdx) return 'completed';
    if (currentIdx === beforeIdx) return 'active';
    return 'pending';
  }

  private showToast(text: string, type: 'success' | 'danger') {
    this.toastMessage.set({text, type});
    setTimeout(() => this.toastMessage.set(null), 5000);
  }

  private closeModal(modalId: string) {
    if (typeof document !== 'undefined') {
      const modalInstance = document.getElementById(modalId);
      if (modalInstance) {
        const closeBtn = modalInstance.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
        if (closeBtn) closeBtn.click();
      }
    }
  }
}
