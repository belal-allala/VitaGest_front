import { Component, EventEmitter, Output, inject } from '@angular/core';
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
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);
  private router = inject(Router);

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

