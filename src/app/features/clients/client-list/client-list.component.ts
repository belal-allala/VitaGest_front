import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Client } from '../../../core/models/client.model';
import { Vente } from '../../../core/models/vente.model';
import { Prescription } from '../../../core/models/prescription.model';
import { ClientService } from '../../../core/services/client.service';
import { VenteService } from '../../../core/services/vente.service';
import { PrescriptionService } from '../../../core/services/prescription.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.css'],
})
export class ClientListComponent implements OnInit {
  // ─── Services ────────────────────────────────────────────────────────────
  private clientService       = inject(ClientService);
  private venteService        = inject(VenteService);
  private prescriptionService = inject(PrescriptionService);
  private fb                  = inject(FormBuilder);
  private authService         = inject(AuthService);

  // ─── Modal visibility signals ─────────────────────────────────────────────
  showClientModal  = signal(false);
  showDossierModal = signal(false);

  // ─── State ────────────────────────────────────────────────────────────────
  clients           = signal<Client[]>([]);
  searchTerm        = signal('');
  isLoading         = signal(false);
  isSaving          = signal(false);
  isDossierLoading  = signal(false);
  editingId         = signal<number | null>(null);
  dossierClient     = signal<Client | null>(null);
  dossierVentes     = signal<Vente[]>([]);
  dossierRx         = signal<Prescription[]>([]);
  errorMsg          = signal('');
  successMsg        = signal('');
  confirmDeleteId   = signal<number | null>(null);
  isAdmin           = signal<boolean>(false);

  // ─── Computed search filter ────────────────────────────────────────────────
  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.clients();
    return this.clients().filter(c =>
      `${c.nom} ${c.prenom}`.toLowerCase().includes(term) ||
      (c.email?.toLowerCase().includes(term) ?? false) ||
      (c.tel?.includes(term) ?? false)
    );
  });

  // ─── Reactive Form ────────────────────────────────────────────────────────
  clientForm!: FormGroup;

  ngOnInit(): void {
    this.isAdmin.set(this.authService.isAdmin());
    this.buildForm();
    this.loadClients();
  }

  private buildForm(): void {
    this.clientForm = this.fb.group({
      nom:            ['', [Validators.required, Validators.minLength(2)]],
      prenom:         ['', [Validators.required, Validators.minLength(2)]],
      email:          ['', [Validators.required, Validators.email]],
      tel:            ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      allergies:      [''],   // string, converted on save
      gdprConsent:    [false, [Validators.requiredTrue]],
    });
  }

  get f() { return this.clientForm.controls; }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  loadClients(): void {
    this.isLoading.set(true);
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Impossible de charger les clients.');
        this.isLoading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.clientForm.reset({ gdprConsent: false });
    this.showClientModal.set(true);
  }

  openEdit(client: Client): void {
    this.editingId.set(client.id ?? null);
    this.clientForm.patchValue({
      ...client,
      allergies: client.allergies || '',
      gdprConsent: client.consentRgpd || false,
    });
    this.showDossierModal.set(false);
    this.showClientModal.set(true);
  }

  closeClientModal(): void {
    this.showClientModal.set(false);
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const raw = this.clientForm.getRawValue();
    const payload: Client = {
      nom:            raw.nom,
      prenom:         raw.prenom,
      email:          raw.email,
      tel:            raw.tel,
      allergies:      raw.allergies || undefined,
      consentRgpd:    raw.gdprConsent,
    };

    this.isSaving.set(true);
    const id = this.editingId();

    const request$ = id
      ? this.clientService.updateClient(id, payload)
      : this.clientService.createClient(payload);

    request$.subscribe({
      next: (saved) => {
        if (id) {
          this.clients.update(list => list.map(c => c.id === id ? { ...saved, id } : c));
          this.showSuccess('Client mis à jour avec succès.');
        } else {
          this.clients.update(list => [...list, saved]);
          this.showSuccess('Client ajouté avec succès.');
        }
        this.isSaving.set(false);
        this.showClientModal.set(false);
      },
      error: () => {
        this.errorMsg.set('Erreur lors de la sauvegarde du client.');
        this.isSaving.set(false);
      },
    });
  }

  requestDelete(id: number): void {
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.clientService.deleteClient(id).subscribe({
      next: () => {
        this.clients.update(list => list.filter(c => c.id !== id));
        this.confirmDeleteId.set(null);
        this.showSuccess('Client supprimé.');
      },
      error: () => {
        this.errorMsg.set('Erreur lors de la suppression.');
        this.confirmDeleteId.set(null);
      },
    });
  }

  // ─── Dossier Médical ──────────────────────────────────────────────────────
  openDossier(client: Client): void {
    this.dossierClient.set(client);
    this.dossierVentes.set([]);
    this.dossierRx.set([]);
    this.isDossierLoading.set(true);
    this.showDossierModal.set(true);

    const id = client.id!;
    forkJoin({
      ventes:        this.venteService.getVentesByClient(id),
      prescriptions: this.prescriptionService.getPrescriptionsByClient(id),
    }).subscribe({
      next: ({ ventes, prescriptions }) => {
        const sorted = [...ventes].sort((a, b) =>
          new Date(b.dateVente ?? '').getTime() - new Date(a.dateVente ?? '').getTime()
        );
        this.dossierVentes.set(sorted.slice(0, 5));
        this.dossierRx.set(prescriptions.filter(p => p.status === 'ACTIVE'));
        this.isDossierLoading.set(false);
      },
      error: () => {
        this.isDossierLoading.set(false);
      },
    });
  }

  closeDossierModal(): void {
    this.showDossierModal.set(false);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  hasAllergies(client: Client): boolean {
    return !!client.allergies && client.allergies.trim().length > 0;
  }

  getAllergiesArray(client: Client): string[] {
    if (!client.allergies) return [];
    return client.allergies.split(',').map(a => a.trim()).filter(a => !!a);
  }

  getAllergiesText(client: Client): string {
    return client.allergies || '';
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '0,00 MAD';
    return value.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 4000);
  }
}
