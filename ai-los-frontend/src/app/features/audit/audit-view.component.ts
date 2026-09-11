import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AuditEvent, LoanApplication } from '../../core/models/models';

@Component({
  selector: 'app-audit-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="audit-page animate-fade-in">
      <!-- Breadcrumb Bar -->
      <div class="breadcrumb-bar">
        <a [routerLink]="backRoute()" [queryParams]="{appId: appId}" class="breadcrumb-back">
          <span class="material-icons">arrow_back</span>
          <span>Back to {{ backLabel() }}</span>
        </a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">Application #{{ appId }} Audit Trail</span>
      </div>

      <div class="audit-header">
        <div>
          <h2>Application Immutable Audit Trail & Decision Lineage</h2>
          <p>Read-only chronological ledger of all state transitions, human actions, AI summaries, and overrides.</p>
        </div>

        <div class="header-actions">
          <a [routerLink]="backRoute()" [queryParams]="{appId: appId}" class="btn btn-secondary btn-sm">
            <span class="material-icons">arrow_back</span> {{ backLabel() }}
          </a>

          <div class="app-selector-box">
            <label>Application ID:</label>
            <input type="number" [(ngModel)]="appId" (change)="loadAudit()" placeholder="App #" />
            <button type="button" class="btn btn-primary btn-sm" (click)="loadAudit()">Load</button>
          </div>

          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="exportCsv()"
            [disabled]="events().length === 0"
          >
            <span class="material-icons">download</span> Export CSV (LOS-FR-015)
          </button>
        </div>
      </div>

      <!-- Audit Trail Table -->
      <div class="audit-card card">
        @if (loading()) {
          <div class="loading-state">
            <span class="material-icons spin">sync</span> Loading audit lineage...
          </div>
        } @else if (events().length === 0) {
          <div class="empty-state">
            <span class="material-icons">history</span>
            <h4>No audit records found</h4>
            <p>Enter an Application ID above to inspect its decision history.</p>
          </div>
        } @else {
          <div class="audit-timeline">
            @for (event of events(); track event.id) {
              <div class="timeline-entry">
                <div class="timeline-marker">
                  <span class="material-icons">{{ getEventIcon(event.eventType) }}</span>
                </div>
                <div class="timeline-content">
                  <div class="t-header">
                    <span class="event-title">{{ event.eventType.replace(/_/g, ' ') }}</span>
                    <span class="event-time">{{ event.createdAt | date:'medium' }}</span>
                  </div>
                  <div class="t-meta">
                    <span>Actor: <strong>{{ event.actorId }}</strong></span> •
                    <span class="badge badge-draft">{{ event.actorRole }}</span>
                    @if (event.beforeState || event.afterState) {
                      <span class="transition-badge">
                        {{ event.beforeState || 'START' }} ➔ {{ event.afterState }}
                      </span>
                    }
                  </div>
                  @if (event.details) {
                    <div class="event-details-box">
                      <pre>{{ event.details | json }}</pre>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .breadcrumb-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .breadcrumb-back {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
      &:hover { text-decoration: underline; }
      .material-icons { font-size: 16px; }
    }
    .breadcrumb-separator {
      color: #94a3b8;
    }
    .breadcrumb-current {
      color: #64748b;
      font-weight: 500;
    }
    .audit-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .audit-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; }
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .app-selector-box {
      display: flex;
      align-items: center;
      gap: 8px;
      label { font-size: 13px; font-weight: 600; color: #475569; }
      input {
        width: 90px;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--border);
        font-size: 13px;
      }
    }
    .audit-card { padding: 32px; }
    .audit-timeline {
      position: relative;
      padding-left: 20px;
      &::before {
        content: '';
        position: absolute;
        left: 35px;
        top: 10px;
        bottom: 10px;
        width: 2px;
        background: #e2e8f0;
      }
    }
    .timeline-entry {
      display: flex;
      gap: 20px;
      margin-bottom: 28px;
      position: relative;
    }
    .timeline-marker {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #eff6ff;
      border: 2px solid #3b82f6;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      .material-icons { font-size: 18px; }
    }
    .timeline-content {
      flex: 1;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .t-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      .event-title { font-weight: 800; font-size: 14px; color: #0f172a; }
      .event-time { font-size: 12px; color: #94a3b8; }
    }
    .t-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .transition-badge {
      background: #ede9fe;
      color: #6d28d9;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    .event-details-box {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      pre { font-size: 11px; color: #334155; margin: 0; white-space: pre-wrap; }
    }
    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
      .material-icons { font-size: 48px; color: #cbd5e1; margin-bottom: 8px; }
    }
  `]
})
export class AuditViewComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly backRoute = computed(() => {
    const role = this.auth.activeRole();
    if (role === 'manager') return '/manager';
    if (role === 'loan_officer') return '/officer';
    return '/customer';
  });

  readonly backLabel = computed(() => {
    const role = this.auth.activeRole();
    if (role === 'manager') return 'Decision Queue';
    if (role === 'loan_officer') return 'Officer Queue';
    return 'Dashboard';
  });

  appId = 1;
  events = signal<AuditEvent[]>([]);
  loading = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['appId']) {
        this.appId = +params['appId'];
      }
      this.loadAudit();
    });
  }

  loadAudit(): void {
    if (!this.appId) return;
    this.loading.set(true);
    this.api.getAuditHistory(this.appId).subscribe({
      next: (evs) => {
        this.events.set(evs);
        this.loading.set(false);
      },
      error: () => {
        this.events.set([]);
        this.loading.set(false);
      },
    });
  }

  exportCsv(): void {
    if (!this.appId) return;
    this.api.downloadAuditCsv(this.appId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `application-${this.appId}-audit-trail.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
    });
  }

  getEventIcon(eventType: string): string {
    if (eventType.includes('CREATE')) return 'add_circle';
    if (eventType.includes('SUBMIT')) return 'send';
    if (eventType.includes('REVIEW')) return 'rate_review';
    if (eventType.includes('AI')) return 'psychology';
    if (eventType.includes('DECISION')) return 'verified';
    if (eventType.includes('CLARIFICATION')) return 'help';
    return 'circle';
  }
}
