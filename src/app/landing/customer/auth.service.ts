// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  user_type: string;
  user_role_id: number;
  profile_image?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl  = environment.authApiBaseUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }

  // Sign Up
  signUp(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, userData);
  }

  // Sign In
  signIn(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.token && response.user) {
            this.setSession(response.token, response.user);
          }
        })
      );
  }

  // Social Login
  socialLogin(provider: string, token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/social-login`, {
      provider,
      token
    }).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  // Set session after login
  private setSession(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Load user from storage
  private loadUserFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      this.currentUserSubject.next(user);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get token
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'admin';
  }

  // Check if user is customer
  isCustomer(): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === 'customer';
  }

  // Logout
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/signin']);
  }
}