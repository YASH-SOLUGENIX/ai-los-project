import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="register-container">
      <div class="register-wrapper">
        <!-- Hero Branding Side -->
        <div class="brand-hero">
          <div class="logo-box">
            <span class="material-icons">account_balance</span>
          </div>
          <h1>Join ApexLoan AI</h1>
          <p class="subtitle">Experience frictionless, transparent digital loan financing with instant AI pre-assessments.</p>

          <div class="benefits-list">
            <div class="benefit-item">
              <span class="material-icons">speed</span>
              <div>
                <strong>Instant Credit Application</strong>
                <p>Configure amounts, tenure, and calculate live EMIs in seconds.</p>
              </div>
            </div>
            <div class="benefit-item">
              <span class="material-icons">verified</span>
              <div>
                <strong>Transparent Status Tracking</strong>
                <p>Live progress stepper and plain-language AI status explainer.</p>
              </div>
            </div>
            <div class="benefit-item">
              <span class="material-icons">lock</span>
              <div>
                <strong>Bank-Grade Keycloak Security</strong>
                <p>Enterprise identity management protecting your financial records.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Registration Form Card -->
        <div class="register-card card">
          <div class="card-header">
            <h2>Create Your Account</h2>
            <p>Fill in your personal details to get started with loan applications</p>
          </div>

          @if (errorMessage()) {
            <div class="alert alert-danger animate-fade-in">
              <span class="material-icons">error_outline</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="alert alert-success animate-fade-in">
              <span class="material-icons">check_circle</span>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="handleRegister()" class="register-form">
            <div class="form-row">
              <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="firstName"
                  name="firstName"
                  placeholder="e.g. Rajesh"
                  required
                />
              </div>

              <div class="form-group">
                <label>Last Name <span class="required">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="lastName"
                  name="lastName"
                  placeholder="e.g. Sharma"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label>Username <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="username"
                name="username"
                placeholder="Choose a unique username"
                required
              />
            </div>

            <div class="form-group">
              <label>Email Address <span class="required">*</span></label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="name@example.com"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Password <span class="required">*</span></label>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>

              <div class="form-group">
                <label>Confirm Password <span class="required">*</span></label>
                <input
                  type="password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="spinner"></span>
                <span>Creating Account...</span>
              } @else {
                <span class="material-icons">person_add</span>
                <span>Create Customer Account</span>
              }
            </button>
          </form>

          <div class="card-footer">
            <p>
              Already have an account?
              <a routerLink="/login" class="link-primary">Sign In here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      background: radial-gradient(circle at top right, #1e293b, #0f172a 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
    }
    .register-wrapper {
      max-width: 1120px;
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1.2fr;
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
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 12px;
      }
      .subtitle {
        font-size: 15px;
        color: #94a3b8;
        line-height: 1.6;
        margin-bottom: 36px;
      }
    }
    .benefits-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .benefit-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      .material-icons {
        color: #38bdf8;
        font-size: 22px;
        background: rgba(56, 189, 248, 0.1);
        padding: 8px;
        border-radius: 10px;
      }
      strong { font-size: 14px; color: #f1f5f9; display: block; margin-bottom: 2px; }
      p { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; }
    }
    .register-card {
      background: #ffffff;
      padding: 36px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .card-header {
      margin-bottom: 22px;
      h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin: 0; }
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      label {
        font-size: 12px;
        font-weight: 600;
        color: #334155;
      }
      .required { color: #ef4444; }
      input {
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        color: #0f172a;
        background: #f8fafc;
        transition: all 0.2s;
        &:focus {
          outline: none;
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
      }
    }
    .btn-block {
      width: 100%;
      height: 46px;
      font-size: 15px;
      font-weight: 600;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
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
      margin-bottom: 16px;
      .material-icons { font-size: 18px; }
    }
    .alert-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      .material-icons { font-size: 18px; }
    }
    .card-footer {
      margin-top: 20px;
      text-align: center;
      p {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .link-primary {
        color: #2563eb;
        font-weight: 600;
        text-decoration: none;
        margin-left: 4px;
        &:hover { text-decoration: underline; }
      }
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 900px) {
      .register-wrapper {
        grid-template-columns: 1fr;
        gap: 32px;
      }
      .brand-hero { text-align: center; }
      .benefits-list { display: none; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async handleRegister(): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Client-side validations
    if (!this.firstName || !this.lastName || !this.username || !this.email || !this.password) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match. Please verify and re-enter.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.loading.set(true);

    try {
      // 1. Register with backend & Keycloak
      await this.auth.register({
        username: this.username.trim(),
        email: this.email.trim(),
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        password: this.password,
      });

      this.successMessage.set('Account created successfully! Logging you in...');

      // 2. Automatically log the user in
      await this.auth.login(this.username.trim(), this.password);

      // 3. Redirect to Customer Dashboard
      setTimeout(() => {
        this.router.navigate(['/customer']);
      }, 1000);
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || err?.message || 'Registration failed. The username or email may already be in use.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
