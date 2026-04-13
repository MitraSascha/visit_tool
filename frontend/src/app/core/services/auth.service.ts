import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse, AuthUser } from '../models/auth.model';

const ACCESS_TOKEN_KEY  = 'cv_access_token';
const REFRESH_TOKEN_KEY = 'cv_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(this.loadUserFromToken());
  readonly user    = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  // ── Login ────────────────────────────────────────────────────────────────

  login(credentials: LoginRequest) {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(tokens => {
          localStorage.setItem(ACCESS_TOKEN_KEY,  tokens.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
          this._user.set(this.decodeUser(tokens.access_token));
        })
      );
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  // ── Token-Zugriff (für Interceptor) ─────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  // ── Token Refresh ────────────────────────────────────────────────────────

  refreshTokens() {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
        refresh_token: this.getRefreshToken()
      })
      .pipe(
        tap(tokens => {
          localStorage.setItem(ACCESS_TOKEN_KEY,  tokens.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
          this._user.set(this.decodeUser(tokens.access_token));
        })
      );
  }

  // ── Intern ───────────────────────────────────────────────────────────────

  private loadUserFromToken(): AuthUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Date.now() >= payload.exp * 1000) return null;
      return { id: Number(payload.sub), email: payload.email };
    } catch {
      return null;
    }
  }

  private decodeUser(token: string): AuthUser | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: Number(payload.sub), email: payload.email };
    } catch {
      return null;
    }
  }
}
