import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserProfile, UserRole } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000';
  private currentUserSignal = signal<UserProfile | null>(null);

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly activeRole = computed(() => this.currentUserSignal()?.role ?? null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.restoreSession();
  }

  private async restoreSession(): Promise<void> {
    const saved = localStorage.getItem('apex_user');
    const token = localStorage.getItem('apex_token');
    if (saved && token) {
      try {
        const user = JSON.parse(saved) as UserProfile;
        user.token = token;
        this.currentUserSignal.set(user);

        // Check if token is expired or expiring within 30s
        if (this.isTokenExpired(token)) {
          await this.refreshToken();
        }
      } catch {
        this.logout();
      }
    }
  }

  isTokenExpired(token?: string | null): boolean {
    const t = token || this.getToken();
    if (!t) return true;
    const payload = this.decodeJwt(t);
    if (!payload.exp) return false;
    // Expired if current time >= exp time - 15 seconds buffer
    return Date.now() >= (payload.exp * 1000 - 15000);
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('apex_refresh_token');
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${this.API_URL}/auth/refresh`, { refreshToken }),
      );

      const newToken = res.access_token;
      if (!newToken) throw new Error('No access token received from refresh');

      localStorage.setItem('apex_token', newToken);
      if (res.refresh_token) {
        localStorage.setItem('apex_refresh_token', res.refresh_token);
      }

      const user = this.currentUserSignal();
      if (user) {
        user.token = newToken;
        localStorage.setItem('apex_user', JSON.stringify(user));
        this.currentUserSignal.set({ ...user });
      }

      return newToken;
    } catch (err) {
      console.warn('Session refresh failed, redirecting to login:', err);
      this.logout();
      return null;
    }
  }

  async login(username: string, password: string): Promise<UserProfile> {
    const res: any = await firstValueFrom(
      this.http.post(`${this.API_URL}/auth/login`, { username, password }),
    );

    const token = res.access_token;
    const payload = this.decodeJwt(token);

    const roles: string[] = payload.realm_access?.roles ?? [];
    let role: UserRole = 'customer';
    if (roles.includes('manager')) {
      role = 'manager';
    } else if (roles.includes('loan_officer')) {
      role = 'loan_officer';
    } else if (roles.includes('auditor')) {
      role = 'auditor';
    }

    const user: UserProfile = {
      id: payload.sub,
      username: payload.preferred_username || username,
      email: payload.email || `${username}@example.com`,
      role,
      token,
      firstName: payload.given_name || username,
      lastName: payload.family_name || '',
    };

    localStorage.setItem('apex_token', token);
    if (res.refresh_token) {
      localStorage.setItem('apex_refresh_token', res.refresh_token);
    }
    localStorage.setItem('apex_user', JSON.stringify(user));
    this.currentUserSignal.set(user);

    return user;
  }

  async register(dto: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${this.API_URL}/auth/register`, dto),
    );
  }

  async quickSwitchRole(role: UserRole): Promise<void> {
    const credentials: Record<UserRole, { u: string; p: string; dest: string }> = {
      customer: { u: 'testcustomer', p: 'Password@123', dest: '/customer' },
      loan_officer: { u: 'testofficer', p: 'Password@123', dest: '/officer' },
      manager: { u: 'testmanager', p: 'Password@123', dest: '/manager' },
      auditor: { u: 'testofficer', p: 'Password@123', dest: '/audit' },
      admin: { u: 'testmanager', p: 'Password@123', dest: '/manager' },
    };

    const target = credentials[role];
    if (target) {
      await this.login(target.u, target.p);
      this.router.navigate([target.dest]);
    }
  }

  hasRole(requiredRole: UserRole | UserRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  }

  getToken(): string | null {
    return this.currentUserSignal()?.token || localStorage.getItem('apex_token');
  }

  logout(): void {
    const refreshToken = localStorage.getItem('apex_refresh_token') || undefined;
    this.http.post(`${this.API_URL}/auth/logout`, { refreshToken }).subscribe({
      next: () => {},
      error: () => {},
    });
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_refresh_token');
    localStorage.removeItem('apex_user');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }
}
