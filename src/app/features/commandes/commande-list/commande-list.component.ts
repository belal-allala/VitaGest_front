import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommandeService } from '../../../core/services/commande.service';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { MedicamentService } from '../../../core/services/medicament.service';
import { AuthService } from '../../../core/services/auth.service';
import { Commande, CommandeStatus, CommandeItem } from '../../../core/models/commande.model';
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
    const payload = this.commandeForm.value;
    payload.statut = 'EN_ATTENTE'; 

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
      case 'BROUILLON': return 'badge rounded-pill bg-secondary text-white';
      case 'EN_ATTENTE': return 'badge rounded-pill bg-warning text-dark border border-warning';
      case 'RECUE': return 'badge rounded-pill bg-success text-white';
      default: return 'badge rounded-pill bg-light text-dark';
    }
  }

  getStepperClasses(statut: string, step: string): string {
    const statuses = ['BROUILLON', 'EN_ATTENTE', 'RECUE'];
    const currentIdx = statuses.indexOf(statut);
    const stepIdx = statuses.indexOf(step);

    if (currentIdx >= stepIdx) {
      return 'stepper-step-active';
    }
    return 'stepper-step-inactive';
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
