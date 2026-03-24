import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  currentYear = new Date().getFullYear();
  isAdmin = signal<boolean>(false);
  userName = signal<string>('Utilisateur');
  userInitial = signal<string>('U');
  userRole = signal<string>('Employé');
  
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.isAdmin.set(this.authService.isAdmin());
    const user = this.authService.currentUserValue;
    if (user) {
       this.userName.set(user.username);
       this.userInitial.set(user.username ? user.username.charAt(0).toUpperCase() : 'U');
       this.userRole.set(this.authService.isAdmin() ? 'Administrateur' : 'Pharmacien(ne)');
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
