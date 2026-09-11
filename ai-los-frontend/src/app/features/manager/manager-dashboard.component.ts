import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AiRecommendationResult,
  AiSummary,
  EligibilityResult,
  LoanApplication,
  LoanDocument,
} from '../../core/models/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="manager-page animate-fade-in">
      <!-- Executive Header -->
      <div class="page-header">
        <div>
          <h2>Credit Manager Decisioning & Portfolio Control</h2>
          <p>Authorize loans, review underwriting recommendations against AI risk benchmarks, and enforce credit policy compliance.</p>
        </div>
        <div class="header-tools">
          <button type="button" class="btn btn-secondary" (click)="openStaffModal()">
            <span class="material-icons">manage_accounts</span> Staff Governance
          </button>
          <button type="button" class="btn btn-secondary" (click)="loadQueue()">
            <span class="material-icons">refresh</span> Refresh Portfolio
          </button>
        </div>
      </div>

      <!-- Executive Portfolio Metrics Cards -->
      <div class="portfolio-metrics-grid">
        <div class="p-card card">
          <div class="p-icon icon-amber"><span class="material-icons">pending_actions</span></div>
          <div class="p-data">
            <span class="p-value">{{ pendingDecisions().length }}</span>
            <span class="p-label">Awaiting Final Decision</span>
          </div>
        </div>

        <div class="p-card card">
          <div class="p-icon icon-green"><span class="material-icons">check_circle</span></div>
          <div class="p-data">
            <span class="p-value">{{ approvedCount() }}</span>
            <span class="p-label">Approved Loans</span>
          </div>
        </div>

        <div class="p-card card">
          <div class="p-icon icon-red"><span class="material-icons">cancel</span></div>
          <div class="p-data">
            <span class="p-value">{{ rejectedCount() }}</span>
            <span class="p-label">Declined Loans</span>
          </div>
        </div>

        <div class="p-card card">
          <div class="p-icon icon-blue"><span class="material-icons">account_balance</span></div>
          <div class="p-data">
            <span class="p-value">₹{{ (totalExposure() / 100000).toFixed(1) }}L</span>
            <span class="p-label">Total Portfolio Pipeline</span>
          </div>
        </div>
      </div>

      <!-- Main Layout: Left Queue & Right Decision Dossier -->
      <div class="manager-grid">
        <!-- Decision Queue List -->
        <div class="queue-card card">
          <div class="queue-header">
            <h3>Decision Pipeline</h3>
            <span class="badge badge-under_review">{{ queue().length }} Records</span>
          </div>

          <div class="queue-list">
            @for (app of queue(); track app.id) {
              <div
                class="queue-item"
                [class.selected]="selectedApp()?.id === app.id"
                (click)="selectApplication(app)"
              >
                <div class="q-top">
                  <span class="q-id">#{{ app.id }} • {{ app.applicantName || 'Applicant' }}</span>
                  <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                    {{ app.status.replace('_', ' ') }}
                  </span>
                </div>
                <div class="q-details">
                  <span class="q-amount">₹{{ formatCurrency(app.requestedAmount) }}</span>
                  <span class="q-tenure">{{ app.requestedTenureMonths }} Mos • {{ app.employmentType || 'Salaried' }}</span>
                </div>
                <div class="q-footer">
                  <span>Updated {{ app.updatedAt | date:'short' }}</span>
                  @if (app.status === 'OFFICER_RECOMMENDED') {
                    <span class="action-required-tag">Needs Decision</span>
                  }
                </div>
              </div>
            }
            @if (queue().length === 0) {
              <div class="no-records">
                <span class="material-icons">done_all</span>
                <p>All recommended applications have been decided.</p>
              </div>
            }
          </div>
        </div>

        <!-- Decision Dossier -->
        <div class="dossier-column">
          @if (selectedApp(); as app) {
            <div class="dossier-card card animate-fade-in">
              <!-- Dossier Header -->
              <div class="dossier-header">
                <div>
                  <div class="title-row">
                    <h2>Credit Decision Dossier: #{{ app.id }}</h2>
                    <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                      {{ app.status.replace('_', ' ') }}
                    </span>
                  </div>
                  <p class="subtitle">Applicant: <strong>{{ app.applicantName || 'Anonymous' }}</strong> (Customer: {{ app.customerId }})</p>
                </div>

                <a [routerLink]="['/audit']" [queryParams]="{appId: app.id}" class="btn btn-secondary btn-sm">
                  <span class="material-icons">history</span> View Audit Trail
                </a>
              </div>

              <!-- Financial & DTI Cards -->
              <div class="fin-grid">
                <div class="fin-card">
                  <span class="fin-label">Requested Loan</span>
                  <span class="fin-val">₹{{ formatCurrency(app.requestedAmount) }}</span>
                  <span class="fin-sub">{{ app.requestedTenureMonths }} Months Tenure</span>
                </div>

                <div class="fin-card">
                  <span class="fin-label">Monthly Income</span>
                  <span class="fin-val">₹{{ formatCurrency(app.monthlyIncome) }}</span>
                  <span class="fin-sub">{{ app.employerName || 'Employer' }}</span>
                </div>

                <div class="fin-card">
                  <span class="fin-label">Existing Obligations</span>
                  <span class="fin-val">₹{{ formatCurrency(app.monthlyObligations) }}</span>
                  <span class="fin-sub">Applicant Liabilities</span>
                </div>

                <div class="fin-card">
                  <span class="fin-label">Projected DTI</span>
                  <span class="fin-val" [class.text-danger]="dti() > 50">{{ dti() }}%</span>
                  <span class="fin-sub">{{ dti() > 50 ? 'Exceeds 50% Limit' : 'Within Guidelines' }}</span>
                </div>
              </div>

              <!-- Comparative Assessment Card: Officer vs AI Advisory (LOS-FR-010, LOS-BR-07) -->
              <div class="comparison-card">
                <div class="comp-header">
                  <span class="material-icons">compare_arrows</span>
                  <h4>Underwriting Synthesis & Recommendation Comparison</h4>
                </div>

                <div class="comp-grid">
                  <!-- Officer Side -->
                  <div class="comp-col officer-col">
                    <div class="comp-col-header">
                      <span class="material-icons">support_agent</span>
                      <strong>Loan Officer Recommendation</strong>
                    </div>
                    <div class="comp-body">
                      <div class="rec-pill rec-proceed">
                        Recommendation: PROCEED
                      </div>
                      <p class="rationale-text">
                        "Applicant meets minimum age and product limits. Salary slip verified and take-home income supports estimated EMI. Recommends approval."
                      </p>
                    </div>
                  </div>

                  <!-- AI Advisory Side -->
                  <div class="comp-col ai-col">
                    <div class="comp-col-header">
                      <span class="material-icons">psychology</span>
                      <strong>AI Policy Assessment (RAG)</strong>
                      <button type="button" class="btn-xs-link" (click)="loadAiRec(app.id)" [disabled]="loadingAi()">
                        {{ loadingAi() ? 'Running...' : 'Run RAG' }}
                      </button>
                    </div>
                    <div class="comp-body">
                      @if (aiRec(); as rec) {
                        <div class="rec-pill" [class]="'rec-' + rec.recommendation.toLowerCase()">
                          Advisory: {{ rec.recommendation }}
                        </div>
                        <ul class="ai-reasons-list">
                          @for (r of rec.reasons; track r) { <li>{{ r }}</li> }
                        </ul>
                        @if (rec.citations.length > 0) {
                          <span class="citation-hint">Citing {{ rec.citations.length }} approved policy chunk(s).</span>
                        }
                      } @else {
                        <p class="placeholder-text">Click "Run RAG" to execute policy-grounded evaluation.</p>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Decision Action Console (LOS-FR-012) -->
              <div class="decision-console">
                <div class="console-header">
                  <span class="material-icons">verified_user</span>
                  <h4>Record Final Credit Decision (LOS-FR-012)</h4>
                </div>

                @if (app.status === 'MANAGER_APPROVED' || app.status === 'MANAGER_REJECTED') {
                  <div class="alert alert-info">
                    <span class="material-icons">check_circle</span>
                    <span>Decision already finalized for this application: <strong>{{ app.status }}</strong>. Decision records are immutable.</span>
                  </div>
                } @else {
                  <div class="decision-buttons">
                    <button
                      type="button"
                      class="dec-btn btn-approve"
                      [class.selected]="decisionChoice === 'APPROVE'"
                      (click)="setDecisionChoice('APPROVE')"
                    >
                      <span class="material-icons">check_circle</span>
                      <div>
                        <strong>APPROVE</strong>
                        <span>Issue Formal Sanction</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="dec-btn btn-reject"
                      [class.selected]="decisionChoice === 'REJECT'"
                      (click)="setDecisionChoice('REJECT')"
                    >
                      <span class="material-icons">cancel</span>
                      <div>
                        <strong>REJECT</strong>
                        <span>Decline Application</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      class="dec-btn btn-return"
                      [class.selected]="decisionChoice === 'RETURN'"
                      (click)="setDecisionChoice('RETURN')"
                    >
                      <span class="material-icons">replay</span>
                      <div>
                        <strong>RETURN</strong>
                        <span>Send Back to Officer</span>
                      </div>
                    </button>
                  </div>

                  <!-- Mandatory Override Justification Warning (LOS-BR-07) -->
                  @if (isOverride()) {
                    <div class="override-alert animate-fade-in">
                      <span class="material-icons">policy</span>
                      <div>
                        <strong>Human Override Protocol Triggered (Rule LOS-BR-07)</strong>
                        <p>Your decision differs from the AI advisory benchmark or Officer recommendation. You must provide an explicit, policy-grounded business justification for this override in the decision reason below.</p>
                      </div>
                    </div>
                  }

                  <div class="form-group">
                    <label>
                      Decision Rationale / Override Reason (Mandatory)
                    </label>
                    <textarea
                      [(ngModel)]="decisionReason"
                      rows="3"
                      placeholder="Provide comprehensive credit risk justification for this final decision..."
                    ></textarea>
                  </div>

                  <button
                    type="button"
                    class="btn btn-primary btn-block"
                    (click)="submitDecision(app.id)"
                    [disabled]="!decisionChoice || !decisionReason || actionLoading()"
                  >
                    @if (actionLoading()) {
                      <span>Recording Decision Event...</span>
                    } @else {
                      <span class="material-icons">verified</span>
                      <span>Commit Immutable Decision ({{ decisionChoice }})</span>
                    }
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="no-selection card">
              <span class="material-icons info-icon">verified_user</span>
              <h3>Select Application for Final Decisioning</h3>
              <p>Choose an officer-recommended application from the queue on the left to review underwriting findings and issue approval.</p>
            </div>
          }
        </div>
      </div>

      <!-- Staff Directory & Governance Modal -->
      @if (showStaffModal()) {
        <div class="modal-overlay" (click)="closeStaffModal()">
          <div class="modal-content card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="material-icons modal-header-icon">admin_panel_settings</span>
                <div>
                  <h3>Internal Staff Directory & Governance</h3>
                  <p>Manage Loan Officers and Credit Managers persisted in PostgreSQL database.</p>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-sm btn-secondary" (click)="triggerKeycloakSync()" [disabled]="staffLoading()">
                  <span class="material-icons">sync</span> Sync Keycloak
                </button>
                <button type="button" class="btn btn-sm btn-primary" (click)="toggleProvisionForm()">
                  <span class="material-icons">{{ showProvisionForm() ? 'close' : 'person_add' }}</span>
                  {{ showProvisionForm() ? 'Close Form' : 'Provision Staff' }}
                </button>
                <button type="button" class="close-btn" (click)="closeStaffModal()">
                  <span class="material-icons">close</span>
                </button>
              </div>
            </div>

            @if (staffSuccessMsg()) {
              <div class="alert alert-success animate-fade-in">
                <span class="material-icons">check_circle</span>
                <span>{{ staffSuccessMsg() }}</span>
              </div>
            }

            @if (staffErrorMsg()) {
              <div class="alert alert-danger animate-fade-in">
                <span class="material-icons">error_outline</span>
                <span>{{ staffErrorMsg() }}</span>
              </div>
            }

            <!-- Provision Form Drawer -->
            @if (showProvisionForm()) {
              <form (ngSubmit)="submitProvisionStaff()" class="provision-box card animate-fade-in">
                <h4>Provision New Bank Staff Member</h4>
                <div class="form-grid">
                  <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" [(ngModel)]="staffFullName" name="staffFullName" placeholder="e.g. Sarah Jenkins" required />
                  </div>
                  <div class="form-group">
                    <label>Username *</label>
                    <input type="text" [(ngModel)]="staffUsername" name="staffUsername" placeholder="e.g. sjenkins" required />
                  </div>
                  <div class="form-group">
                    <label>Corporate Email *</label>
                    <input type="email" [(ngModel)]="staffEmail" name="staffEmail" placeholder="sjenkins@apexbank.local" required />
                  </div>
                  <div class="form-group">
                    <label>Initial Password *</label>
                    <input type="password" [(ngModel)]="staffPassword" name="staffPassword" placeholder="Temporary password" required />
                  </div>
                  <div class="form-group">
                    <label>Role *</label>
                    <select [(ngModel)]="staffRole" name="staffRole" (change)="onRoleChange()">
                      <option value="loan_officer">Loan Underwriter (loan_officers)</option>
                      <option value="manager">Credit Decision Manager (managers)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Employee ID *</label>
                    <input type="text" [(ngModel)]="staffEmployeeId" name="staffEmployeeId" placeholder="EMP-OFF-101" required />
                  </div>
                  <div class="form-group">
                    <label>Branch Code</label>
                    <input type="text" [(ngModel)]="staffBranchCode" name="staffBranchCode" placeholder="MAIN-BRANCH" />
                  </div>
                  <div class="form-group">
                    <label>{{ staffRole === 'manager' ? 'Sanction Limit (₹)' : 'Review Limit (₹)' }}</label>
                    <input type="number" [(ngModel)]="staffLimit" name="staffLimit" />
                  </div>
                </div>
                <div class="form-buttons">
                  <button type="submit" class="btn btn-primary" [disabled]="staffLoading()">
                    <span class="material-icons">how_to_reg</span>
                    <span>{{ staffLoading() ? 'Provisioning...' : 'Create in Keycloak & PostgreSQL' }}</span>
                  </button>
                  <button type="button" class="btn btn-secondary" (click)="toggleProvisionForm()">Cancel</button>
                </div>
              </form>
            }

            <!-- Staff Tables -->
            <div class="staff-tables-container">
              <!-- Credit Managers -->
              <div class="staff-table-card">
                <div class="staff-table-header">
                  <h4><span class="material-icons text-green">verified_user</span> Credit Decision Managers ({{ staffList().managers.length }})</h4>
                  <span class="badge badge-manager">PostgreSQL Table: managers</span>
                </div>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Full Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Branch</th>
                        <th>Approval Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of staffList().managers; track m.id) {
                        <tr>
                          <td><code>{{ m.employeeId }}</code></td>
                          <td><strong>{{ m.fullName }}</strong></td>
                          <td>{{ m.username }}</td>
                          <td>{{ m.email }}</td>
                          <td>{{ m.branchCode }}</td>
                          <td>₹{{ formatCurrency(m.approvalLimit) }}</td>
                        </tr>
                      }
                      @if (staffList().managers.length === 0) {
                        <tr><td colspan="6" class="text-muted">No managers found in database.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Loan Officers -->
              <div class="staff-table-card">
                <div class="staff-table-header">
                  <h4><span class="material-icons text-blue">badge</span> Loan Underwriting Officers ({{ staffList().loanOfficers.length }})</h4>
                  <span class="badge badge-loan_officer">PostgreSQL Table: loan_officers</span>
                </div>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Full Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Branch</th>
                        <th>Department</th>
                        <th>Review Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (o of staffList().loanOfficers; track o.id) {
                        <tr>
                          <td><code>{{ o.employeeId }}</code></td>
                          <td><strong>{{ o.fullName }}</strong></td>
                          <td>{{ o.username }}</td>
                          <td>{{ o.email }}</td>
                          <td>{{ o.branchCode }}</td>
                          <td>{{ o.department }}</td>
                          <td>₹{{ formatCurrency(o.maxReviewAmount) }}</td>
                        </tr>
                      }
                      @if (staffList().loanOfficers.length === 0) {
                        <tr><td colspan="7" class="text-muted">No loan officers found in database.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .manager-page {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 24px;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      h2 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 14px; color: #64748b; }
    }
    .portfolio-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }
    .p-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .p-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      .material-icons { font-size: 26px; }
      &.icon-amber { background: #fef3c7; color: #d97706; }
      &.icon-green { background: #ecfdf5; color: #059669; }
      &.icon-red { background: #fef2f2; color: #dc2626; }
      &.icon-blue { background: #eff6ff; color: #2563eb; }
    }
    .p-value { font-size: 24px; font-weight: 800; color: #0f172a; display: block; line-height: 1.1; }
    .p-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .manager-grid {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 24px;
    }
    .queue-card {
      padding: 20px;
      height: fit-content;
    }
    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      h3 { font-size: 16px; font-weight: 700; color: #0f172a; }
    }
    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .queue-item {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { background: #ffffff; border-color: #cbd5e1; }
      &.selected { background: #eff6ff; border-color: #2563eb; }
    }
    .q-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      .q-id { font-weight: 700; font-size: 13px; color: #0f172a; }
    }
    .q-details {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
      .q-amount { font-size: 16px; font-weight: 800; color: #1e3a8a; }
      .q-tenure { font-size: 12px; color: #64748b; }
    }
    .q-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      .action-required-tag {
        background: #fef3c7;
        color: #b45309;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
    .dossier-card { padding: 28px; }
    .dossier-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        h2 { font-size: 20px; font-weight: 800; color: #0f172a; }
      }
      .subtitle { font-size: 13px; color: #64748b; }
    }
    .fin-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .fin-card {
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      .fin-label { font-size: 11px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px; }
      .fin-val { font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 2px; }
      .fin-sub { font-size: 11px; color: #94a3b8; }
    }
    .comparison-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      .comp-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #1e3a8a;
        margin-bottom: 14px;
        h4 { font-size: 15px; font-weight: 700; }
      }
    }
    .comp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .comp-col {
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #f8fafc;
      .comp-col-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        margin-bottom: 10px;
        strong { color: #0f172a; flex: 1; }
        .material-icons { font-size: 18px; color: #2563eb; }
      }
      .rec-pill {
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 8px;
        border-radius: 6px;
        margin-bottom: 8px;
        &.rec-proceed { background: #dcfce7; color: #15803d; }
        &.rec-review { background: #fef3c7; color: #b45309; }
        &.rec-decline { background: #fee2e2; color: #b91c1c; }
      }
      .rationale-text { font-size: 12px; color: #475569; font-style: italic; line-height: 1.5; }
      .ai-reasons-list {
        font-size: 12px;
        color: #1e293b;
        padding-left: 16px;
        margin-bottom: 8px;
      }
      .citation-hint { font-size: 11px; color: #a21caf; font-weight: 600; }
      .placeholder-text { font-size: 12px; color: #94a3b8; }
      .btn-xs-link {
        background: transparent;
        border: none;
        color: #2563eb;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }
    }
    .decision-console {
      background: #f8fafc;
      border: 2px solid #0f172a;
      border-radius: 12px;
      padding: 24px;
      .console-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0f172a;
        margin-bottom: 18px;
        h4 { font-size: 16px; font-weight: 800; }
        .material-icons { font-size: 22px; color: #059669; }
      }
    }
    .decision-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .dec-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #ffffff;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
      strong { display: block; font-size: 13px; }
      span { font-size: 11px; color: #64748b; }
      &.btn-approve {
        .material-icons { color: #059669; font-size: 24px; }
        &.selected { border-color: #059669; background: #ecfdf5; box-shadow: 0 0 0 2px #059669; }
      }
      &.btn-reject {
        .material-icons { color: #dc2626; font-size: 24px; }
        &.selected { border-color: #dc2626; background: #fef2f2; box-shadow: 0 0 0 2px #dc2626; }
      }
      &.btn-return {
        .material-icons { color: #d97706; font-size: 24px; }
        &.selected { border-color: #d97706; background: #fffbeb; box-shadow: 0 0 0 2px #d97706; }
      }
    }
    .override-alert {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
      color: #9a3412;
      .material-icons { font-size: 24px; color: #ea580c; }
      strong { font-size: 13px; display: block; margin-bottom: 2px; }
      p { font-size: 12px; margin: 0; line-height: 1.5; }
    }
    .btn-block { width: 100%; height: 46px; font-size: 15px; }
    .no-records { text-align: center; padding: 30px; color: #94a3b8; }
    .no-selection {
      padding: 80px 24px;
      text-align: center;
      .info-icon { font-size: 48px; color: #94a3b8; margin-bottom: 12px; }
      h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
      p { font-size: 14px; color: #64748b; }
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-content {
      width: 100%;
      max-width: 1080px;
      max-height: 90vh;
      overflow-y: auto;
      background: #ffffff;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      .modal-title-group {
        display: flex;
        align-items: center;
        gap: 12px;
        .modal-header-icon { font-size: 32px; color: #2563eb; }
        h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        p { font-size: 13px; color: #64748b; margin: 0; }
      }
      .modal-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        .close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #64748b;
          &:hover { color: #0f172a; }
        }
      }
    }
    .provision-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 20px;
      margin-bottom: 24px;
      h4 { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 16px;
      }
      .form-buttons {
        display: flex;
        gap: 10px;
      }
    }
    .staff-tables-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .staff-table-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      .staff-table-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f1f5f9;
        h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          .material-icons { font-size: 18px; }
          .text-green { color: #059669; }
          .text-blue { color: #2563eb; }
        }
      }
      .table-responsive { overflow-x: auto; }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        th { background: #f8fafc; padding: 10px 14px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid var(--border); }
        td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
      }
    }
  `]
})
export class ManagerDashboardComponent implements OnInit {
  queue = signal<LoanApplication[]>([]);
  selectedApp = signal<LoanApplication | null>(null);
  aiRec = signal<AiRecommendationResult | null>(null);

  loadingAi = signal(false);
  actionLoading = signal(false);

  // Staff Governance Modal Signals
  showStaffModal = signal(false);
  showProvisionForm = signal(false);
  staffList = signal<{ loanOfficers: any[]; managers: any[] }>({ loanOfficers: [], managers: [] });
  staffLoading = signal(false);
  staffSuccessMsg = signal('');
  staffErrorMsg = signal('');

  staffFullName = '';
  staffUsername = '';
  staffEmail = '';
  staffPassword = '';
  staffRole: 'loan_officer' | 'manager' = 'loan_officer';
  staffEmployeeId = 'EMP-OFF-' + Math.floor(100 + Math.random() * 900);
  staffBranchCode = 'MAIN-BRANCH';
  staffLimit = 1000000;

  decisionChoice: 'APPROVE' | 'REJECT' | 'RETURN' = 'APPROVE';
  decisionReason = '';

  // Portfolio metrics
  readonly pendingDecisions = computed(() =>
    this.queue().filter((a) => a.status === 'OFFICER_RECOMMENDED'),
  );

  readonly approvedCount = computed(() =>
    this.queue().filter((a) => a.status === 'MANAGER_APPROVED').length,
  );

  readonly rejectedCount = computed(() =>
    this.queue().filter((a) => a.status === 'MANAGER_REJECTED').length,
  );

  readonly totalExposure = computed(() =>
    this.queue().reduce((sum, a) => sum + Number(a.requestedAmount || 0), 0),
  );

  formatCurrency(val?: number | string | null): string {
    return Number(val || 0).toLocaleString('en-IN');
  }

  readonly dti = computed(() => {
    const app = this.selectedApp();
    if (!app || !app.monthlyIncome) return 0;
    const P = Number(app.requestedAmount || 0);
    const n = app.requestedTenureMonths;
    const r = 12 / 12 / 100;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalObligations = Number(app.monthlyObligations || 0) + emi;
    return Math.round((totalObligations / Number(app.monthlyIncome)) * 100);
  });

  readonly isOverride = computed(() => {
    // If AI recommended DECLINE or REVIEW and Manager chose APPROVE
    const rec = this.aiRec()?.recommendation;
    if (rec && rec !== 'PROCEED' && this.decisionChoice === 'APPROVE') {
      return true;
    }
    return false;
  });

  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadQueue();
    this.route.queryParams.subscribe((params) => {
      const targetId = params['appId'] ? Number(params['appId']) : null;
      if (targetId && this.queue().length > 0) {
        const found = this.queue().find((a) => a.id === targetId);
        if (found && this.selectedApp()?.id !== targetId) {
          this.selectApplication(found);
        }
      }
    });
  }

  loadQueue(): void {
    this.api.getWorkQueues().subscribe({
      next: (apps) => {
        this.queue.set(apps);
        const paramId = this.route.snapshot.queryParams['appId']
          ? Number(this.route.snapshot.queryParams['appId'])
          : null;
        if (paramId) {
          const matched = apps.find((a) => a.id === paramId);
          if (matched) {
            this.selectApplication(matched);
            return;
          }
        }
        if (apps.length > 0 && !this.selectedApp()) {
          const pending = apps.find((a) => a.status === 'OFFICER_RECOMMENDED');
          this.selectApplication(pending || apps[0]);
        }
      },
      error: () => {},
    });
  }

  selectApplication(app: LoanApplication): void {
    this.selectedApp.set(app);
    this.aiRec.set(null);
    this.decisionChoice = 'APPROVE';
    this.decisionReason = '';
    this.loadAiRec(app.id);
  }

  loadAiRec(appId: number): void {
    this.loadingAi.set(true);
    this.api.generateAiRecommendation(appId).subscribe({
      next: (rec) => {
        this.aiRec.set(rec);
        this.loadingAi.set(false);
      },
      error: () => this.loadingAi.set(false),
    });
  }

  setDecisionChoice(choice: 'APPROVE' | 'REJECT' | 'RETURN'): void {
    this.decisionChoice = choice;
    if (choice === 'APPROVE') {
      this.decisionReason = 'Approved in full compliance with credit policy guidelines and officer endorsement.';
    } else if (choice === 'REJECT') {
      this.decisionReason = 'Declined due to debt burden or policy risk criteria.';
    } else {
      this.decisionReason = 'Returned to underwriting officer for further verification of reported liabilities.';
    }
  }

  submitDecision(appId: number): void {
    if (!this.decisionChoice || !this.decisionReason) return;
    this.actionLoading.set(true);

    this.api
      .makeDecision(appId, {
        decision: this.decisionChoice,
        reason: this.decisionReason,
      })
      .subscribe({
        next: () => {
          alert(`Manager decision recorded: ${this.decisionChoice}`);
          this.actionLoading.set(false);
          this.loadQueue();
        },
        error: (err) => {
          alert('Failed to record decision: ' + (err?.error?.message || err.message));
          this.actionLoading.set(false);
        },
      });
  }

  // ----------------------------------------------------
  // Staff Directory & Governance Methods
  // ----------------------------------------------------
  openStaffModal(): void {
    this.showStaffModal.set(true);
    this.staffSuccessMsg.set('');
    this.staffErrorMsg.set('');
    this.loadStaff();
  }

  closeStaffModal(): void {
    this.showStaffModal.set(false);
  }

  toggleProvisionForm(): void {
    this.showProvisionForm.update((v) => !v);
  }

  onRoleChange(): void {
    if (this.staffRole === 'manager') {
      this.staffEmployeeId = 'EMP-MGR-' + Math.floor(100 + Math.random() * 900);
      this.staffBranchCode = 'HQ-DECISIONING';
      this.staffLimit = 5000000;
    } else {
      this.staffEmployeeId = 'EMP-OFF-' + Math.floor(100 + Math.random() * 900);
      this.staffBranchCode = 'MAIN-BRANCH';
      this.staffLimit = 1000000;
    }
  }

  loadStaff(): void {
    this.staffLoading.set(true);
    this.api.getAllStaff().subscribe({
      next: (data) => {
        this.staffList.set(data);
        this.staffLoading.set(false);
      },
      error: (err) => {
        this.staffErrorMsg.set('Failed to load staff directory: ' + (err?.error?.message || err.message));
        this.staffLoading.set(false);
      },
    });
  }

  triggerKeycloakSync(): void {
    this.staffLoading.set(true);
    this.staffSuccessMsg.set('');
    this.staffErrorMsg.set('');
    this.api.syncKeycloakUsers().subscribe({
      next: (res) => {
        this.staffSuccessMsg.set(res.message || 'Keycloak synchronization completed.');
        this.loadStaff();
      },
      error: (err) => {
        this.staffErrorMsg.set('Sync failed: ' + (err?.error?.message || err.message));
        this.staffLoading.set(false);
      },
    });
  }

  submitProvisionStaff(): void {
    if (!this.staffFullName || !this.staffUsername || !this.staffEmail || !this.staffPassword || !this.staffEmployeeId) {
      this.staffErrorMsg.set('Please complete all required fields (*)');
      return;
    }
    this.staffLoading.set(true);
    this.staffSuccessMsg.set('');
    this.staffErrorMsg.set('');

    const payload: any = {
      username: this.staffUsername,
      email: this.staffEmail,
      fullName: this.staffFullName,
      password: this.staffPassword,
      role: this.staffRole,
      employeeId: this.staffEmployeeId,
      branchCode: this.staffBranchCode,
    };
    if (this.staffRole === 'manager') {
      payload.approvalLimit = Number(this.staffLimit);
    } else {
      payload.maxReviewAmount = Number(this.staffLimit);
      payload.department = 'Retail Underwriting';
    }

    this.api.provisionStaff(payload).subscribe({
      next: (res) => {
        this.staffSuccessMsg.set(res.message || 'Staff member provisioned successfully!');
        this.showProvisionForm.set(false);
        this.staffFullName = '';
        this.staffUsername = '';
        this.staffEmail = '';
        this.staffPassword = '';
        this.onRoleChange();
        this.loadStaff();
      },
      error: (err) => {
        this.staffErrorMsg.set('Provisioning failed: ' + (err?.error?.message || err.message));
        this.staffLoading.set(false);
      },
    });
  }
}
