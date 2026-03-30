import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MedicamentService } from '../../../core/services/medicament.service';
import { ClientService } from '../../../core/services/client.service';
import { VenteService } from '../../../core/services/vente.service';
import { Medicament } from '../../../core/models/medicament.model';
import { Client } from '../../../core/models/client.model';
import { Vente, VenteLigne } from '../../../core/models/vente.model';
import { Prescription } from '../../../core/models/prescription.model';
import { PrescriptionService } from '../../../core/services/prescription.service';

@Component({
  selector: 'app-point-de-vente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './point-de-vente.component.html',
  styleUrls: ['./point-de-vente.component.css']
})
export class PointDeVenteComponent implements OnInit {
  // Services
  private medicamentService = inject(MedicamentService);
  private clientService = inject(ClientService);
  private venteService = inject(VenteService);
  private prescriptionService = inject(PrescriptionService);

  // Search State
  medicaments: Medicament[] = [];
  filteredMedicaments: Medicament[] = [];
  searchQuery = '';

  // Clients State
  clients: Client[] = [];
  selectedClientId: number | null = null;
  clientPrescriptions: Prescription[] = [];
  selectedPrescriptionId: number | null = null;
  isLoadingPrescriptions = false;

  // Cart State
  cartItems: VenteLigne[] = [];

  // Payment State
  paymentMode: 'ESPECES' | 'CARTE' | 'CHEQUE' = 'ESPECES';
  amountReceived = 0;

  get changeDue(): number {
    if (this.paymentMode !== 'ESPECES') return 0;
    const diff = this.amountReceived - this.totalTTC;
    return diff > 0 ? diff : 0;
  }

  // Feedback State
  alertMessage = '';
  alertType: 'success' | 'danger' | 'warning' = 'success';
  isSubmitting = false;

  ngOnInit() {
    this.loadMedicaments();
    this.loadClients();
  }

  loadMedicaments() {
    this.medicamentService.getAllMedicaments().subscribe({
      next: (data) => {
         this.medicaments = data;
         this.filteredMedicaments = data;
      },
      error: (err) => console.error('Error fetching catalog', err)
    });
  }

  loadClients() {
    this.clientService.getAllClients().subscribe({
      next: (data) => this.clients = data,
      error: (err) => console.error('Error fetching clients', err)
    });
  }

  onClientChange() {
    this.selectedPrescriptionId = null;
    this.clientPrescriptions = [];

    if (!this.selectedClientId) {
      return;
    }

    this.isLoadingPrescriptions = true;
    this.prescriptionService.getPrescriptionsByClient(this.selectedClientId).subscribe({
      next: (data) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.clientPrescriptions = data.filter((prescription) => {
          const validity = new Date(prescription.validityDate);
          validity.setHours(0, 0, 0, 0);
          return prescription.status !== 'USED' && validity >= today;
        });
        this.isLoadingPrescriptions = false;
      },
      error: () => {
        this.clientPrescriptions = [];
        this.isLoadingPrescriptions = false;
      },
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredMedicaments = this.medicaments;
      return;
    }
    this.filteredMedicaments = this.medicaments.filter(m =>
      m.nom.toLowerCase().includes(q) || m.dci.toLowerCase().includes(q)
    );
  }

  addToCart(med: Medicament) {
    this.clearAlert();
    this.amountReceived = 0; // Reset prompt

    // Check if already in cart
    const existingIndex = this.cartItems.findIndex(item => item.medicamentId === med.id);

    if (existingIndex !== -1) {
      // Logic for adding - in a real app you'd check StockService here if you maintained a real-time count.
      // For this step we just increment. The backend will enforce the actual max count.
      this.cartItems[existingIndex].quantite++;
    } else {
      if (med.id) {
         this.cartItems.push({
          medicamentId: med.id,
          medicament: med,
          quantite: 1,
          prixUnitaire: med.prix
        });
      }
    }
  }

  incrementQuantity(index: number) {
    this.cartItems[index].quantite++;
    this.clearAlert();
    this.amountReceived = 0;
  }

  decrementQuantity(index: number) {
    if (this.cartItems[index].quantite > 1) {
      this.cartItems[index].quantite--;
    } else {
      this.removeItem(index);
    }
    this.clearAlert();
    this.amountReceived = 0;
  }

  removeItem(index: number) {
    this.cartItems.splice(index, 1);
    this.amountReceived = 0;
  }

  get totalHT(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.prixUnitaire || 0) * item.quantite, 0);
  }

  get totalTVA(): number {
    return this.totalHT * 0.20; // 20% TVA
  }

  get totalTTC(): number {
    return this.totalHT + this.totalTVA;
  }

  showAlert(msg: string, type: 'success' | 'danger' | 'warning') {
    this.alertMessage = msg;
    this.alertType = type;
  }

  clearAlert() {
    this.alertMessage = '';
  }

  submitVente() {
    if (this.cartItems.length === 0) return;
    if (this.paymentMode === 'ESPECES' && this.amountReceived < this.totalTTC) {
      this.showAlert('Le montant reçu est insuffisant pour finaliser la vente.', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.clearAlert();

    const ventePayload: Vente = {
      lignes: this.cartItems.map(item => ({
        medicamentId: item.medicamentId,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire
      })),
      total: this.totalTTC,
      mode: this.paymentMode,
      clientId: this.selectedClientId || undefined
    };

    this.venteService.createVente(ventePayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cartItems = [];
        this.selectedClientId = null;
        this.selectedPrescriptionId = null;
        this.clientPrescriptions = [];
        this.searchQuery = '';
        this.filteredMedicaments = this.medicaments;
        this.showAlert('Vente réussie ! Le ticket de caisse a été enregistré.', 'success');
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.showAlert('Stock insuffisant pour un ou plusieurs articles. Veuillez vérifier les quantités.', 'warning');
        } else if (error.status === 409) {
          this.showAlert('Le stock est en cours de mise à jour, réessayez.', 'warning');
        } else {
          this.showAlert('Erreur de connexion avec le serveur lors de la vente.', 'danger');
        }
      }
    });
  }
}
