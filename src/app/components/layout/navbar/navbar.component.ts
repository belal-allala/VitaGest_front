import { Component, EventEmitter, Output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  userName = signal<string>('Utilisateur');
  userInitial = signal<string>('U');
  userRole = signal<string>('Employé');

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (user) {
       this.userName.set(user.username);
       this.userInitial.set(user.username ? user.username.charAt(0).toUpperCase() : 'U');
       this.userRole.set(this.authService.isAdmin() ? 'Administrateur' : 'Pharmacien(ne)');
    }
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  get currentTitle(): string {
    // Titre statique pour l’instant; pourra être remplacé par un vrai breadcrumb.
    return 'Dashboard';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

