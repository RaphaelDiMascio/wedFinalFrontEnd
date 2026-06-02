import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false
})
export class LoginComponent {
  isLoginMode = true;
  username = '';
  password = '';
  confirmPassword = '';
  
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // If already logged in, redirect directly to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.username = '';
    this.password = '';
    this.confirmPassword = '';
  }

  onSubmit(): void {
    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    if (!this.isLoginMode && this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = { username: this.username.trim(), password: this.password };

    if (this.isLoginMode) {
      this.authService.login(payload).subscribe({
        next: () => {
          this.successMessage = 'Connexion réussie ! Redirection...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect.';
          console.error(err);
        }
      });
    } else {
      this.authService.register(payload).subscribe({
        next: () => {
          this.successMessage = 'Compte créé avec succès ! Redirection...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Ce nom d\'utilisateur existe déjà.';
          console.error(err);
        }
      });
    }
  }
}
