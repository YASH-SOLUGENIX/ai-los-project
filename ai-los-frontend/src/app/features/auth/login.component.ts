import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-wrapper">
        <!-- Hero branding -->
        <div class="brand-hero">
          <div class="logo-box">
            <span class="material-icons">account_balance</span>
          </div>
          <h1>ApexLoan AI</h1>
          <p class="subtitle">Next-Generation Digital Loan Origination & Underwriting System</p>

          <div class="features-list">
            <div class="feature-item">
              <span class="material-icons">bolt</span>
              <div>
                <strong>Deterministic Rule Engine</strong>
                <p>Real-time DTI calculation, product eligibility & maturity validation</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="material-icons">psychology</span>
              <div>
                <strong>Policy-Grounded AI Advisory</strong>
                <p>Retrieval-augmented generation (RAG) with policy chunk citations</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="material-icons">security</span>
              <div>
                <strong>Strict Role Isolation</strong>
                <p>Separated workflows for Applicants, Underwriters, and Credit Managers</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Login Card -->
        <div class="auth-card card">
          <div class="card-header">
            <h2>Welcome Back</h2>
            <p>Sign in with your registered customer account or corporate credentials</p>
          </div>

          @if (errorMessage()) {
            <div class="alert alert-danger">
              <span class="material-icons">error_outline</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Direct Keycloak Form -->
          <form (ngSubmit)="handleLogin()" class="login-form">
            <div class="form-group">
              <label>Username</label>
              <input
                type="text"
                [(ngModel)]="username"
                name="username"
                placeholder="Enter your username"
                required
              />
            </div>

            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span>Authenticating with Keycloak...</span>
              } @else {
                <span class="material-icons">login</span>
                <span>Sign In</span>
              }
            </button>
          </form>

          <!-- Create Account Navigation Prompt -->
          <div class="signup-prompt">
            <span>New customer?</span>
            <a routerLink="/register" class="btn-create-account">
              <span class="material-icons">person_add</span> Create an Account
            </a>
          </div>

          <!-- Divider -->
          <div class="divider">
            <span>SAMPLE APPLICANT ACCESS</span>
          </div>

          <!-- Quick Persona Cards -->
          <div class="persona-cards">
            <button
              type="button"
              class="persona-btn persona-customer"
              (click)="quickLaunch('customer')"
              [disabled]="loading()"
            >
              <div class="persona-icon"><span class="material-icons">person</span></div>
              <div class="persona-info">
                <strong>Sample Borrower Access</strong>
                <span>testcustomer / Password@123</span>
              </div>
              <span class="material-icons chevron">arrow_forward</span>
            </button>
          </div>

          <!-- Staff Enterprise Notice -->
          <div class="staff-notice">
            <span class="material-icons">admin_panel_settings</span>
            <span>Bank staff (Loan Officers & Credit Managers) must sign in using Administrator-provisioned credentials.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      background: radial-gradient(circle at top right, #1e293b, #0f172a 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
    }
    .login-wrapper {
      max-width: 1080px;
      width: 100%;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 48px;
      align-items: center;
    }
    .brand-hero {
      color: #ffffff;
      .logo-box {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
        .material-icons { font-size: 32px; color: #ffffff; }
      }
      h1 {
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 12px;
      }
      .subtitle {
        font-size: 16px;
        color: #94a3b8;
        line-height: 1.6;
        margin-bottom: 36px;
      }
    }
    .features-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      .material-icons {
        color: #38bdf8;
        font-size: 24px;
        background: rgba(56, 189, 248, 0.1);
        padding: 8px;
        border-radius: 10px;
      }
      strong { font-size: 15px; color: #f1f5f9; display: block; margin-bottom: 2px; }
      p { font-size: 13px; color: #94a3b8; margin: 0; }
    }
    .auth-card {
      background: #ffffff;
      padding: 36px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .card-header {
      margin-bottom: 24px;
      h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin: 0; }
    }
    .alert-danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      .material-icons { font-size: 18px; }
    }
    .btn-block {
      width: 100%;
      height: 44px;
      font-size: 15px;
    }
    .signup-prompt {
      margin-top: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      span {
        font-size: 13px;
        color: #64748b;
      }
      .btn-create-account {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #2563eb;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
        .material-icons {
          font-size: 16px;
        }
      }
    }
    .divider {
      position: relative;
      text-align: center;
      margin: 28px 0 20px;
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e2e8f0;
      }
      span {
        position: relative;
        background: #ffffff;
        padding: 0 12px;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.05em;
      }
    }
    .persona-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .persona-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      &:hover {
        background: #ffffff;
        border-color: #cbd5e1;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        transform: translateY(-1px);
        .chevron { transform: translateX(3px); }
      }
      .persona-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        .material-icons { font-size: 20px; }
      }
      .persona-info {
        flex: 1;
        strong { display: block; font-size: 13px; color: #0f172a; }
        span { font-size: 11px; color: #64748b; }
      }
      .chevron {
        color: #94a3b8;
        font-size: 18px;
        transition: transform 0.2s;
      }
      &.persona-customer .persona-icon { background: #e0f2fe; color: #0284c7; }
    }
    .staff-notice {
      margin-top: 16px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
      .material-icons {
        font-size: 18px;
        color: #475569;
        flex-shrink: 0;
      }
    }
    @media (max-width: 900px) {
      .login-wrapper {
        grid-template-columns: 1fr;
        gap: 32px;
      }
      .brand-hero { text-align: center; }
      .features-list { display: none; }
    }
  `]
})
export class LoginComponent {
  username = 'testcustomer';
  password = 'Password@123';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async handleLogin(): Promise<void> {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const user = await this.auth.login(this.username, this.password);
      if (user.role === 'customer') {
        this.router.navigate(['/customer']);
      } else if (user.role === 'loan_officer') {
        this.router.navigate(['/officer']);
      } else if (user.role === 'manager') {
        this.router.navigate(['/manager']);
      } else {
        this.router.navigate(['/customer']);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Invalid username or password. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async quickLaunch(role: UserRole): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.quickSwitchRole(role);
    } catch (err: any) {
      this.errorMessage.set('Could not authenticate persona: ' + (err?.error?.message || err.message));
    } finally {
      this.loading.set(false);
    }
  }
}
