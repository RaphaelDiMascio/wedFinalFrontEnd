import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  
  // Expose the current user as a read-only signal
  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  register(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      tap(registeredUser => this.setSession(registeredUser))
    );
  }

  login(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, user).pipe(
      tap(loggedInUser => this.setSession(loggedInUser))
    );
  }

  logout(): void {
    localStorage.removeItem('current_user');
    this.currentUserSignal.set(null);
  }

  private setSession(user: User): void {
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private loadSession(): void {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        this.currentUserSignal.set(user);
      } catch (e) {
        localStorage.removeItem('current_user');
      }
    }
  }
}
