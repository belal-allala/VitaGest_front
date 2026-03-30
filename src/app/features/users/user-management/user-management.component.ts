import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, Role } from '../../../core/models/user.model';
import { Vente } from '../../../core/models/vente.model';
import { VenteService } from '../../../core/services/vente.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  // Signals Strategy
  users = signal<User[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(true);
  globalError = signal<string | null>(null);

  // Computed Values
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const allUsers = this.users();
    if (!term) return allUsers;
    return allUsers.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      this.getUserRoleString(u).toLowerCase().includes(term)
    );
  });

  // Services
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Identity logic
  currentAdminEmail = signal<string | null>(null);

  // Form handling
  userForm: FormGroup;
  passwordResetForm: FormGroup;
  isEditMode = signal<boolean>(false);
  currentUserId = signal<number | null>(null);
  userToToggle = signal<User | null>(null);

  // --- Analytics & Stats ---
  private venteService = inject(VenteService);
  selectedUserForStats = signal<User | null>(null);
  userVentes = signal<Vente[]>([]);
  isStatsLoading = signal<boolean>(false);

  totalSalesCount = computed(() => this.userVentes().length);
  revenueGenerated = computed(() => {
    return this.userVentes().reduce((sum, v) => sum + (v.total || 0), 0);
  });
  averageBasket = computed(() => {
    const count = this.totalSalesCount();
    return count > 0 ? this.revenueGenerated() / count : 0;
  });
  activityLog = computed(() => {
    return [...this.userVentes()]
      .sort((a, b) => new Date(b.dateVente || 0).getTime() - new Date(a.dateVente || 0).getTime())
      .slice(0, 5);
  });

  // UX Toasts
  toastMessage = signal<{ text: string, type: 'success' | 'danger' | 'warning' } | null>(null);

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: [''],
      role: ['ROLE_PHARMACIEN', Validators.required],
      isActive: [true]
    });

    this.passwordResetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    const authState = this.authService.currentUserValue;
    if (authState && authState.username) {
      // In LoginRequest we renamed username to email, but authResponse might map email to 'username' inside JWT subject.
      // We read it directly from the token or username field for self-deletion checks.
      this.currentAdminEmail.set(authState.username.toLowerCase());
    }
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.globalError.set(null);
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.globalError.set(err.message || 'Impossible de charger la liste des utilisateurs.');
        this.isLoading.set(false);
        this.showToast('Erreur serveur.', 'danger');
      }
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.currentUserId.set(null);
    this.userForm.reset({ role: 'ROLE_PHARMACIEN', isActive: true });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  openEditModal(user: User) {
    this.isEditMode.set(true);
    this.currentUserId.set(user.id || null);
    this.userForm.patchValue({
      email: user.email,
      username: user.username,
      role: this.getUserRoleString(user),
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  getUserRoleString(user: User): string {
    if (user.role) {
      if (typeof user.role === 'string') return user.role;
      if (typeof user.role === 'object' && 'nom' in user.role) return user.role.nom;
    }
    return 'ROLE_PHARMACIEN';
  }

  onSubmitUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.value;
    const role: Role = { nom: formValue.role };
    const userData: Partial<User> = {
      email: formValue.email,
      username: formValue.username,
      role: role,
      isActive: formValue.isActive,
    };

    if (formValue.password) {
      userData.password = formValue.password;
    }

    const currentId = this.currentUserId();

    // Creation vs Edition logic
    if (this.isEditMode() && currentId) {
      const role: Role = { nom: formValue.role };
      const editData: Partial<User> = {
        email: formValue.email,
        username: formValue.username,
        role: role,
        isActive: formValue.isActive
      };

      this.userService.updateUser(currentId, editData as User).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal('addEditUserModal');
          this.showToast('Utilisateur mis à jour avec succès.', 'success');
        },
        error: (err) => this.showToast(err.message, 'danger')
      });
    } else {
      // REGISTER (Creation) uses AuthService to handle password hashing at backend
      const registerData = {
        email: formValue.email,
        username: formValue.username,
        password: formValue.password,
        role: formValue.role
      };

      this.authService.register(registerData).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal('addEditUserModal');
          this.showToast('Compte utilisateur créé avec succès.', 'success');
        },
        error: (err) => this.showToast(err.message || 'Erreur lors de la création', 'danger')
      });
    }
  }

  // --- Password Reset ---
  openPasswordResetModal(user: User) {
    this.currentUserId.set(user.id || null);
    this.passwordResetForm.reset();
  }

  onResetPassword() {
    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }
    const currentId = this.currentUserId();
    if (!currentId) return;

    const payload = { password: this.passwordResetForm.value.newPassword };

    this.userService.resetPassword(currentId, payload as Partial<User>).subscribe({
      next: () => {
        this.closeModal('resetPasswordModal');
        this.showToast('Le mot de passe a été redéfini avec succès.', 'success');
      },
      error: (err) => this.showToast(err.message, 'danger')
    });
  }

  // --- Soft Delete / Status Toggle ---
  canToggleOrDelete(user: User): boolean {
    const currentEmail = this.currentAdminEmail();
    if (!currentEmail || !user.email) return true;
    return user.email.toLowerCase() !== currentEmail;
  }

  confirmToggle(user: User) {
    // Prevent self toggle
    if (!this.canToggleOrDelete(user)) {
      this.showToast('Action impossible : vous ne pouvez pas désactiver votre propre compte actif.', 'warning');
      return;
    }
    this.userToToggle.set(user);
  }

  executeToggle() {
    const user = this.userToToggle();
    if (user && user.id) {
      this.userService.toggleActiveStatus(user.id).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal('toggleConfirmModal');
          this.userToToggle.set(null);
          this.showToast('Statut de l\'utilisateur modifié avec succès.', 'success');
        },
        error: (err) => {
          this.closeModal('toggleConfirmModal');
          this.showToast(err.message || 'Échec du changement de statut.', 'danger');
        }
      });
    }
  }

  // UX Tools

  // --- Employee Statistics ---
  openStatsModal(user: User) {
    this.selectedUserForStats.set(user);
    this.isStatsLoading.set(true);
    if(user.id) {
       this.venteService.getVentesByUser(user.id).subscribe({
         next: (ventes) => {
           this.userVentes.set(ventes);
           this.isStatsLoading.set(false);
         },
         error: () => {
           this.isStatsLoading.set(false);
           this.showToast('Erreur lors du chargement des statistiques.', 'danger');
         }
       });
    }
  }

  closeStatsModal() {
    this.selectedUserForStats.set(null);
    this.userVentes.set([]);
    this.closeModal('statsModal');
  }
  showToast(text: string, type: 'success' | 'danger' | 'warning') {
    this.toastMessage.set({ text, type });
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
