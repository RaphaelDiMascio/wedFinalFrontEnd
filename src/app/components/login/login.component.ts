import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

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
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    // If already logged in, redirect directly to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.username = '';
    this.password = '';
    this.confirmPassword = '';
  }

  onSubmit(): void {
    if (!this.username.trim() || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez remplir tous les champs.',
        confirmButtonColor: '#003B8D'
      });
      return;
    }

    if (!this.isLoginMode && this.password !== this.confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Mots de passe différents',
        text: 'Les mots de passe ne correspondent pas.',
        confirmButtonColor: '#003B8D'
      });
      return;
    }

    this.isLoading = true;
    const payload = { username: this.username.trim(), password: this.password };

    if (this.isLoginMode) {
      this.authService.login(payload).subscribe({
        next: () => {
          this.zone.run(() => {
            Swal.fire({
              icon: 'success',
              title: 'Connexion réussie !',
              text: 'Redirection vers votre tableau de bord...',
              timer: 1500,
              showConfirmButton: false
            });
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          });
        },
        error: (err) => {
          const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Nom d\'utilisateur ou mot de passe incorrect.';
          this.zone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'error',
              title: 'Erreur de connexion',
              text: errMsg,
              confirmButtonColor: '#003B8D'
            });
          });
          console.error(err);
        }
      });
    } else {
      this.authService.register(payload).subscribe({
        next: () => {
          this.zone.run(() => {
            Swal.fire({
              icon: 'success',
              title: 'Compte créé !',
              text: 'Redirection vers votre tableau de bord...',
              timer: 1500,
              showConfirmButton: false
            });
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          });
        },
        error: (err) => {
          const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Ce nom d\'utilisateur existe déjà.';
          this.zone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'error',
              title: 'Erreur d\'inscription',
              text: errMsg,
              confirmButtonColor: '#003B8D'
            });
          });
          console.error(err);
        }
      });
    }
  }
}
