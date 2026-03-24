import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Client } from '../../../core/models/client.model';
import { Medicament } from '../../../core/models/medicament.model';
import { Prescription, PrescriptionStatus } from '../../../core/models/prescription.model';
import { ClientService } from '../../../core/services/client.service';
import { MedicamentService } from '../../../core/services/medicament.service';
import { PrescriptionService } from '../../../core/services/prescription.service';

interface PrescriptionPageState {
  loading: boolean;
  error: string | null;
  prescriptions: Prescription[];
  clients: Client[];
  medicaments: Medicament[];
}

@Component({
  selector: 'app-prescription-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './prescription-list.component.html',
  styleUrl: './prescription-list.component.css',
})
export class PrescriptionListComponent {
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly clientService = inject(ClientService);
  private readonly medicamentService = inject(MedicamentService);
  private readonly fb = inject(FormBuilder);

  private readonly refreshTick = signal(0);
  readonly searchTerm = signal('');
  readonly showCreateModal = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);
  readonly clientSearchTerm = signal('');

  private readonly initialState: PrescriptionPageState = {
    loading: true,
    error: null,
    prescriptions: [],
    clients: [],
    medicaments: [],
  };

  readonly state = toSignal(
    toObservable(this.refreshTick).pipe(
      switchMap(() =>
        this.prescriptionService.getAllPrescriptions().pipe(
          switchMap((prescriptions) =>
            this.clientService.getAllClients().pipe(
              switchMap((clients) =>
                this.medicamentService
                  .getAllMedicaments()
                  .pipe(map((medicaments) => ({ prescriptions, clients, medicaments })))
              )
            )
          ),
          map((data): PrescriptionPageState => ({ loading: false, error: null, ...data })),
          startWith(this.initialState),
          catchError((error) =>
            of({
              ...this.initialState,
              loading: false,
              error: error instanceof Error ? error.message : 'Erreur de chargement.',
            })
          )
        )
      )
    ),
    { initialValue: this.initialState }
  );

  readonly clientMap = computed(() => {
    const mapById = new Map<number, Client>();
    for (const client of this.state().clients) {
      if (client.id) {
        mapById.set(client.id, client);
      }
    }
    return mapById;
  });

  readonly filteredPrescriptions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.state().prescriptions;
    }
    return this.state().prescriptions.filter((prescription) => {
      const client = this.clientMap().get(prescription.clientId);
      const clientName = client ? `${client.nom} ${client.prenom}`.toLowerCase() : '';
      const doctorName = prescription.doctorName.toLowerCase();
      return clientName.includes(term) || doctorName.includes(term);
    });
  });

  readonly filteredClientsForModal = computed(() => {
    const term = this.clientSearchTerm().toLowerCase().trim();
    if (!term) {
      return this.state().clients;
    }
    return this.state().clients.filter((client) =>
      `${client.nom} ${client.prenom}`.toLowerCase().includes(term)
    );
  });

  readonly prescriptionForm = this.fb.group(
    {
      clientId: [null as number | null, [Validators.required]],
      doctorName: ['', [Validators.required, Validators.minLength(3)]],
      doctorRegistrationNumber: [''],
      datePrescription: [this.todayDate(), [Validators.required, this.notFutureDateValidator]],
      validityDate: [this.defaultValidityDate(), [Validators.required]],
      scannedImageUrl: [''],
      status: ['ACTIVE' as PrescriptionStatus, [Validators.required]],
      items: this.fb.array([this.createPrescriptionItemForm()]),
    },
    { validators: [this.validityAfterPrescriptionValidator] }
  );

  get itemsFormArray(): FormArray {
    return this.prescriptionForm.get('items') as FormArray;
  }

  openCreateModal(): void {
    this.submitError.set(null);
    this.submitSuccess.set(null);
    this.clientSearchTerm.set('');
    this.resetForm();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  addLine(): void {
    this.itemsFormArray.push(this.createPrescriptionItemForm());
  }

  removeLine(index: number): void {
    if (this.itemsFormArray.length === 1) {
      return;
    }
    this.itemsFormArray.removeAt(index);
  }

  onPrescriptionDateChange(): void {
    const dateValue = this.prescriptionForm.get('datePrescription')?.value;
    if (!dateValue) {
      return;
    }
    const validity = new Date(dateValue);
    validity.setMonth(validity.getMonth() + 3);
    this.prescriptionForm.patchValue({ validityDate: this.toIsoDate(validity) });
    this.prescriptionForm.updateValueAndValidity();
  }

  savePrescription(): void {
    if (this.prescriptionForm.invalid) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.prescriptionForm.getRawValue();
    const payload: Prescription = {
      clientId: Number(raw.clientId),
      doctorName: raw.doctorName ?? '',
      doctorRegistrationNumber: raw.doctorRegistrationNumber ?? '',
      datePrescription: raw.datePrescription ?? '',
      validityDate: raw.validityDate ?? '',
      scannedImageUrl: raw.scannedImageUrl ?? '',
      status: raw.status ?? 'ACTIVE',
      items: (raw.items ?? []).map((item) => ({
        medicamentId: Number(item.medicamentId),
        medicamentName: this.getMedicamentName(Number(item.medicamentId)),
        dosage: item.dosage ?? '',
        duration: item.duration ?? '',
        frequency: item.frequency ?? '',
      })),
    };

    this.prescriptionService.createPrescription(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitSuccess.set('Ordonnance enregistrée avec succès.');
        this.closeCreateModal();
        this.refreshTick.update((v) => v + 1);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.submitError.set(error instanceof Error ? error.message : 'Impossible de créer l’ordonnance.');
      },
    });
  }

  refresh(): void {
    this.refreshTick.update((v) => v + 1);
  }

  printSummary(prescription: Prescription): void {
    window.alert(`Impression en préparation pour l'ordonnance #${prescription.id ?? '-'}.`);
  }

  getClientDisplayName(clientId: number): string {
    const client = this.clientMap().get(clientId);
    return client ? `${client.nom} ${client.prenom}` : `Client #${clientId}`;
  }

  getStatusLabel(prescription: Prescription): PrescriptionStatus {
    if (prescription.status === 'USED') {
      return 'USED';
    }
    const today = new Date(this.todayDate());
    const validity = new Date(prescription.validityDate);
    if (validity < today) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  getStatusClass(status: PrescriptionStatus): string {
    if (status === 'ACTIVE') {
      return 'badge bg-success-subtle text-success-emphasis border border-success-subtle';
    }
    if (status === 'EXPIRED') {
      return 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle';
    }
    return 'badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle';
  }

  private createPrescriptionItemForm() {
    return this.fb.group({
      medicamentId: [null as number | null, [Validators.required]],
      dosage: ['', [Validators.required, Validators.minLength(2)]],
      duration: ['', [Validators.required, Validators.minLength(2)]],
      frequency: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  private resetForm(): void {
    this.prescriptionForm.reset({
      clientId: null,
      doctorName: '',
      doctorRegistrationNumber: '',
      datePrescription: this.todayDate(),
      validityDate: this.defaultValidityDate(),
      scannedImageUrl: '',
      status: 'ACTIVE',
    });
    while (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(0);
    }
    this.itemsFormArray.at(0).reset({
      medicamentId: null,
      dosage: '',
      duration: '',
      frequency: '',
    });
  }

  private getMedicamentName(medicamentId: number): string {
    return this.state().medicaments.find((m) => m.id === medicamentId)?.nom ?? `Médicament #${medicamentId}`;
  }

  private todayDate(): string {
    return this.toIsoDate(new Date());
  }

  private defaultValidityDate(): string {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() + 3);
    return this.toIsoDate(baseDate);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private notFutureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const selected = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return selected > today ? { futureDate: true } : null;
  }

  private validityAfterPrescriptionValidator(control: AbstractControl): ValidationErrors | null {
    const prescriptionDate = control.get('datePrescription')?.value;
    const validityDate = control.get('validityDate')?.value;
    if (!prescriptionDate || !validityDate) {
      return null;
    }
    const from = new Date(prescriptionDate);
    const to = new Date(validityDate);
    const diffMs = to.getTime() - from.getTime();
    const minimumMs = 24 * 60 * 60 * 1000;
    return diffMs >= minimumMs ? null : { invalidValidityRange: true };
  }
}

