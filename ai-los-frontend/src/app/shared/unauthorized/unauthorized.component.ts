import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="unauthorized-page">
      <div class="unauthorized-card card">
        <div class="icon-circle">
          <span class="material-icons">gpp_bad</span>
        </div>
        <h2>Access Restricted</h2>
        <p class="desc">
          You do not have administrative or officer authorization to view this area.
          Under BFSI security policies, internal underwriting work queues and manager decision portals are isolated from applicant profiles.
        </p>

        <div class="current-role-info">
          <span>Current Account:</span>
          <strong>{{ auth.currentUser()?.username }}</strong>
          <span class="badge badge-draft">{{ auth.activeRole() }}</span>
        </div>

        <div class="actions">
          @if (auth.hasRole('customer')) {
            <a routerLink="/customer" class="btn btn-primary">
              <span class="material-icons">arrow_back</span> Return to Applicant Portal
            </a>
          } @else if (auth.hasRole('loan_officer')) {
            <a routerLink="/officer" class="btn btn-primary">
              <span class="material-icons">arrow_back</span> Go to Officer Queue
            </a>
          } @else {
            <a routerLink="/manager" class="btn btn-primary">
              <span class="material-icons">arrow_back</span> Go to Manager Queue
            </a>
          }
          <button type="button" class="btn btn-secondary" (click)="auth.logout()">
            <span class="material-icons">switch_account</span> Switch Account
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-page {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .unauthorized-card {
      max-width: 500px;
      text-align: center;
      padding: 40px 32px;
      background: #ffffff;
    }
    .icon-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      .material-icons { font-size: 38px; }
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .current-role-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 28px;
      color: #475569;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
  `]
})
export class UnauthorizedComponent {
  constructor(public readonly auth: AuthService) {}
}
