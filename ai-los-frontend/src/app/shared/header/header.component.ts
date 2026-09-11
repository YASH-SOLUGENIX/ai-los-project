import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header">
      <div class="header-container">
        <a [routerLink]="homeRoute()" class="brand" title="Go to Home Dashboard">
          <div class="logo-mark">
            <span class="material-icons">account_balance</span>
          </div>
          <div class="brand-text">
            <span class="brand-name">ApexLoan <span class="ai-badge">AI</span></span>
            <span class="brand-tagline">Digital Loan Origination System</span>
          </div>
        </a>

        @if (auth.isAuthenticated()) {
          <nav class="nav-links">
            @if (role() === 'customer') {
              <a routerLink="/customer" routerLinkActive="active" class="nav-item">
                <span class="material-icons">dashboard</span> My Applications
              </a>
            }
            @if (role() === 'loan_officer') {
              <a routerLink="/officer" routerLinkActive="active" class="nav-item">
                <span class="material-icons">assignment</span> Officer Queue
              </a>
            }
            @if (role() === 'manager') {
              <a routerLink="/manager" routerLinkActive="active" class="nav-item">
                <span class="material-icons">verified_user</span> Decision Queue
              </a>
            }
            @if (role() === 'loan_officer' || role() === 'manager' || role() === 'auditor') {
              <a routerLink="/audit" routerLinkActive="active" class="nav-item">
                <span class="material-icons">history_edu</span> Audit Trail
              </a>
            }
          </nav>

          <div class="header-actions">
            <!-- User Profile -->
            <div class="user-profile">
              <div class="avatar">{{ userInitials() }}</div>
              <div class="user-details">
                <span class="user-name">{{ user()?.username }}</span>
                <span class="user-role-badge" [class]="'badge-' + role()">
                  {{ roleLabel() }}
                </span>
              </div>
              <div class="user-divider"></div>
              <button type="button" class="btn-logout" (click)="auth.logout()" title="Sign Out">
                <span class="material-icons">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Unauthenticated Navigation Links -->
          <div class="auth-nav-actions">
            <a routerLink="/login" routerLinkActive="active" class="nav-item">
              <span class="material-icons">login</span> Sign In
            </a>
            <a routerLink="/register" routerLinkActive="active" class="btn-register-link">
              <span class="material-icons">person_add</span> Create Account
            </a>
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: #0f172a;
      color: #ffffff;
      border-bottom: 1px solid #1e293b;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .header-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .logo-mark {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
      .material-icons { font-size: 22px; color: #ffffff; }
    }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ai-badge {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .brand-tagline {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s;
      .material-icons { font-size: 18px; }
      &:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }
      &.active { color: #ffffff; background: #1e293b; border: 1px solid #334155; }
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
    }
    .user-divider {
      width: 1px;
      height: 22px;
      background: #334155;
      margin: 0 2px;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .user-details {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
    }
    .user-role-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      &.badge-customer { color: #38bdf8; }
      &.badge-loan_officer { color: #fbbf24; }
      &.badge-manager { color: #34d399; }
    }
    .btn-logout {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
      &:hover {
        color: #ffffff;
        background: #ef4444;
        border-color: #ef4444;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
      }
      .material-icons { font-size: 16px; }
    }
    .auth-nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-register-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
      .material-icons { font-size: 18px; }
      &:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
      }
      &.active {
        background: #1d4ed8;
      }
    }
  `]
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly user = this.auth.currentUser;
  readonly role = this.auth.activeRole;

  readonly homeRoute = computed(() => {
    if (!this.auth.isAuthenticated()) return '/login';
    const role = this.role();
    if (role === 'loan_officer') return '/officer';
    if (role === 'manager') return '/manager';
    return '/customer';
  });

  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return (u.username || 'U').slice(0, 2).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    switch (this.role()) {
      case 'customer': return 'Applicant';
      case 'loan_officer': return 'Loan Officer';
      case 'manager': return 'Credit Manager';
      case 'auditor': return 'Auditor';
      default: return 'User';
    }
  });
}
