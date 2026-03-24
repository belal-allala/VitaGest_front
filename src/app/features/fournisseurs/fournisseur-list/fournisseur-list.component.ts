import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { Fournisseur } from '../../../core/models/fournisseur.model';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './fournisseur-list.component.html'
})
export class FournisseurListComponent implements OnInit {
  fournisseurs: Fournisseur[] = [];
  filteredFournisseurs: Fournisseur[] = [];
  searchTerm = '';
  
  private fournisseurService = inject(FournisseurService);
  private fb = inject(FormBuilder);

  isLoading = true;
  
  fournisseurForm: FormGroup;
  isEditMode = false;
  currentFournisseurId: number | null = null;
  fournisseurToDelete: Fournisseur | null = null;

  constructor() {
    this.fournisseurForm = this.fb.group({
      nom: ['', Validators.required],
      email: ['', [Validators.email]],
      telephone: ['']
    });
  }

  ngOnInit(): void {
    this.loadFournisseurs();
  }

  loadFournisseurs() {
    this.isLoading = true;
    this.fournisseurService.getAllFournisseurs().subscribe({
      next: (data) => {
        this.fournisseurs = data;
        this.filteredFournisseurs = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fournisseurs', err);
        this.isLoading = false;
      }
    });
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredFournisseurs = this.fournisseurs;
      return;
    }
    this.filteredFournisseurs = this.fournisseurs.filter(f => 
      f.nom.toLowerCase().includes(term) || 
      (f.email && f.email.toLowerCase().includes(term))
    );
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentFournisseurId = null;
    this.fournisseurForm.reset();
  }

  openEditModal(f: Fournisseur) {
    this.isEditMode = true;
    this.currentFournisseurId = f.id || null;
    this.fournisseurForm.patchValue({
      nom: f.nom,
      email: f.email,
      telephone: f.telephone
    });
  }

  onSubmit() {
    if (this.fournisseurForm.invalid) {
      this.fournisseurForm.markAllAsTouched();
      return;
    }

    const data: Fournisseur = this.fournisseurForm.value;

    if (this.isEditMode && this.currentFournisseurId) {
      this.fournisseurService.updateFournisseur(this.currentFournisseurId, data).subscribe({
        next: () => {
          this.loadFournisseurs();
          this.closeModal('addEditFournisseurModal');
        },
        error: (err) => console.error('Error updating', err)
      });
    } else {
      this.fournisseurService.createFournisseur(data).subscribe({
        next: () => {
          this.loadFournisseurs();
          this.closeModal('addEditFournisseurModal');
        },
        error: (err) => console.error('Error creating', err)
      });
    }
  }

  confirmDelete(f: Fournisseur) {
    this.fournisseurToDelete = f;
  }

  executeDelete() {
    if (this.fournisseurToDelete && this.fournisseurToDelete.id) {
      this.fournisseurService.deleteFournisseur(this.fournisseurToDelete.id).subscribe({
        next: () => {
          this.loadFournisseurs();
          this.fournisseurToDelete = null;
          this.closeModal('deleteFournisseurModal');
        },
        error: (err) => console.error('Error deleting', err)
      });
    }
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
