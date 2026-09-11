import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AiRecommendationResult,
  AiSummary,
  Clarification,
  EligibilityResult,
  LoanApplication,
  LoanDocument,
} from '../../core/models/models';

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="officer-page animate-fade-in">
      <!-- Work Queue Header -->
      <div class="page-header">
        <div>
          <h2>Loan Underwriting Work Queue</h2>
          <p>Inspect complete applications, evaluate deterministic rules, run AI advisory assessments, and submit recommendations.</p>
        </div>
        <div class="header-tools">
          <div class="search-box">
            <span class="material-icons">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="filterQueue()"
              placeholder="Search by ID or Applicant name..."
            />
          </div>
          <button type="button" class="btn btn-secondary" (click)="loadQueue()">
            <span class="material-icons">refresh</span> Refresh Queue
          </button>
        </div>
      </div>

      <!-- Queue Filters Tabs -->
      <div class="queue-tabs">
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeTab() === 'ALL'"
          (click)="setTab('ALL')"
        >
          All Applications ({{ queue().length }})
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeTab() === 'SUBMITTED'"
          (click)="setTab('SUBMITTED')"
        >
          Submitted / Resubmitted ({{ submittedCount() }})
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeTab() === 'UNDER_REVIEW'"
          (click)="setTab('UNDER_REVIEW')"
        >
          Under Review ({{ inReviewCount() }})
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeTab() === 'CLARIFICATION_REQUIRED'"
          (click)="setTab('CLARIFICATION_REQUIRED')"
        >
          Clarification Required ({{ clarificationCount() }})
        </button>
        <button
          type="button"
          class="queue-tab"
          [class.active]="activeTab() === 'OFFICER_RECOMMENDED'"
          (click)="setTab('OFFICER_RECOMMENDED')"
        >
          Recommended ({{ recommendedCount() }})
        </button>
      </div>

      <!-- Main Layout: Left Queue Table & Right Review Dossier -->
      <div class="officer-grid">
        <!-- Queue Table -->
        <div class="queue-card card">
          <div class="table-container">
            <table class="queue-table">
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Applicant</th>
                  <th>Requested Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (app of filteredQueue(); track app.id) {
                  <tr
                    [class.selected]="selectedApp()?.id === app.id"
                    (click)="selectApplication(app)"
                  >
                    <td><strong>#{{ app.id }}</strong></td>
                    <td>
                      <span class="applicant-cell-name">{{ app.applicantName || 'Anonymous Applicant' }}</span>
                      <span class="applicant-cell-sub">{{ app.employmentType || 'Salaried' }}</span>
                    </td>
                    <td>₹{{ formatCurrency(app.requestedAmount) }}</td>
                    <td>
                      <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                        {{ app.status.replace('_', ' ') }}
                      </span>
                    </td>
                    <td>{{ app.createdAt | date:'shortDate' }}</td>
                    <td>
                      <button type="button" class="btn btn-secondary btn-xs">
                        Review <span class="material-icons">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                }
                @if (filteredQueue().length === 0) {
                  <tr>
                    <td colspan="6" class="no-records">
                      No applications found in this queue category.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Selected Application Review Dossier -->
        <div class="dossier-column">
          @if (selectedApp(); as app) {
            <div class="dossier-card card animate-fade-in">
              <!-- Header -->
              <div class="dossier-header">
                <div>
                  <div class="dossier-title-row">
                    <h3>Review Dossier: #{{ app.id }} — {{ app.applicantName || 'Applicant' }}</h3>
                    <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                      {{ app.status.replace('_', ' ') }}
                    </span>
                  </div>
                  <span class="dossier-meta">Customer ID: {{ app.customerId }} • Version {{ app.version || 1 }}</span>
                </div>

                <div class="dossier-actions-row">
                  <a [routerLink]="['/audit']" [queryParams]="{appId: app.id}" class="btn btn-secondary btn-sm" title="Inspect Immutable Ledger">
                    <span class="material-icons">history</span> View Audit Trail
                  </a>
                  @if (app.status === 'SUBMITTED' || app.status === 'RESUBMITTED') {
                    <button type="button" class="btn btn-primary btn-sm" (click)="startReview(app.id)">
                      <span class="material-icons">play_arrow</span> Mark "Under Review"
                    </button>
                  }
                </div>
              </div>

              <!-- Financial & Deterministic Rule Overview (LOS-BR-03, LOS-FR-005) -->
              <div class="dossier-stats-grid">
                <div class="d-stat">
                  <span class="d-stat-label">Loan Request</span>
                  <span class="d-stat-val">₹{{ formatCurrency(app.requestedAmount) }}</span>
                  <span class="d-stat-sub">{{ app.requestedTenureMonths }} Months Tenure</span>
                </div>

                <div class="d-stat">
                  <span class="d-stat-label">Monthly Income</span>
                  <span class="d-stat-val">₹{{ formatCurrency(app.monthlyIncome) }}</span>
                  <span class="d-stat-sub">{{ app.employerName || 'Reported Employer' }}</span>
                </div>

                <div class="d-stat">
                  <span class="d-stat-label">Monthly Obligations</span>
                  <span class="d-stat-val">₹{{ formatCurrency(app.monthlyObligations) }}</span>
                  <span class="d-stat-sub">Applicant Liabilities</span>
                </div>

                <div class="d-stat">
                  <span class="d-stat-label">Calculated DTI</span>
                  <span class="d-stat-val" [class.text-danger]="dti() > 50">
                    {{ dti() }}%
                  </span>
                  <span class="d-stat-sub">{{ dti() > 50 ? 'Exceeds 50% Limit' : 'Within Policy Limit' }}</span>
                </div>
              </div>

              <!-- Deterministic Eligibility Rules Evaluation -->
              <div class="eligibility-box">
                <div class="eligibility-header">
                  <span class="material-icons">gavel</span>
                  <strong>Deterministic Eligibility Engine (LOS-FR-005)</strong>
                </div>

                @if (eligibilityResult(); as el) {
                  <div class="eligibility-result" [class.passed]="el.eligible" [class.failed]="!el.eligible">
                    <div class="res-status">
                      <span class="material-icons">{{ el.eligible ? 'check_circle' : 'cancel' }}</span>
                      <strong>{{ el.eligible ? 'ELIGIBLE' : 'INELIGIBLE' }}</strong>
                      @if (el.reasonCodes.length > 0) {
                        <span class="codes-list">({{ el.reasonCodes.join(', ') }})</span>
                      }
                    </div>
                    <div class="res-details">
                      <span>Age: {{ el.details.age }} Yrs</span> •
                      <span>Maturity: {{ el.details.maturityAge }} Yrs (Max: {{ el.details.maxMaturityAge }})</span> •
                      <span>Estimated EMI: ₹{{ formatCurrency(el.details.estimatedEmi) }}</span> •
                      <span>DTI: {{ el.details.dti }}%</span>
                    </div>
                  </div>
                } @else {
                  <button type="button" class="btn btn-secondary btn-sm" (click)="evaluateEligibility(app.id)">
                    <span class="material-icons">rule</span> Evaluate Deterministic Rules
                  </button>
                }
              </div>

              <!-- Uploaded Documents Inspector (LOS-FR-006) -->
              <div class="doc-inspector">
                <h4>Uploaded Verification Documents</h4>
                @if (documents().length === 0) {
                  <div class="alert alert-warning">
                    <span class="material-icons">warning</span>
                    <span>No verification documents uploaded.</span>
                  </div>
                } @else {
                  <div class="docs-row">
                    @for (doc of documents(); track doc.id) {
                      <div class="doc-badge-item">
                        <span class="material-icons">picture_as_pdf</span>
                        <div class="doc-b-info">
                          <strong>{{ doc.documentType }}</strong>
                          <span>{{ doc.originalFileName }} ({{ (doc.fileSize / 1024).toFixed(1) }} KB)</span>
                        </div>
                        <span class="badge badge-manager_approved">Verified</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- AI Copilot Panel (LOS-APP-SUMMARY & LOS-POLICY-REVIEW) -->
              <div class="ai-copilot-panel">
                <div class="copilot-header">
                  <div class="copilot-title">
                    <span class="material-icons">psychology</span>
                    <h4>AI Underwriting Copilot & RAG Engine</h4>
                  </div>

                  <div class="copilot-actions">
                    <button
                      type="button"
                      class="btn btn-secondary btn-xs"
                      (click)="generateAiSummary(app.id)"
                      [disabled]="loadingAiSummary()"
                    >
                      <span class="material-icons">summarize</span>
                      {{ loadingAiSummary() ? 'Summarizing...' : 'Generate AI Summary' }}
                    </button>

                    <button
                      type="button"
                      class="btn btn-primary btn-xs"
                      (click)="generateAiRecommendation(app.id)"
                      [disabled]="loadingAiRec()"
                    >
                      <span class="material-icons">policy</span>
                      {{ loadingAiRec() ? 'Evaluating RAG...' : 'Run Policy Review (RAG)' }}
                    </button>

                    <button
                      type="button"
                      class="btn btn-secondary btn-xs"
                      (click)="draftClarificationWithAi(app.id)"
                    >
                      <span class="material-icons">help_center</span> Draft Clarification
                    </button>
                  </div>
                </div>

                <!-- AI Summary Output -->
                @if (aiSummary(); as sum) {
                  <div class="ai-output-box animate-fade-in">
                    <div class="ai-out-header">
                      <span class="badge badge-submitted">LOS-APP-SUMMARY Output</span>
                    </div>
                    <p class="summary-text">{{ sum.summary }}</p>

                    <div class="summary-grid">
                      <div class="s-col">
                        <strong>Extracted Facts:</strong>
                        <ul>
                          @for (f of sum.facts; track f) { <li>{{ f }}</li> }
                        </ul>
                      </div>
                      <div class="s-col">
                        <strong>Missing Items:</strong>
                        <ul>
                          @for (m of sum.missing; track m) { <li class="text-danger">{{ m }}</li> }
                          @if (sum.missing.length === 0) { <li class="text-muted">None detected</li> }
                        </ul>
                      </div>
                      <div class="s-col">
                        <strong>Risk Flags:</strong>
                        <ul>
                          @for (r of sum.risks; track r) { <li class="text-warning">{{ r }}</li> }
                          @if (sum.risks.length === 0) { <li class="text-muted">No high risks</li> }
                        </ul>
                      </div>
                    </div>
                  </div>
                }

                <!-- AI Policy Recommendation (RAG) Output -->
                @if (aiRecommendation(); as rec) {
                  <div class="ai-output-box animate-fade-in policy-box">
                    <div class="ai-out-header">
                      <span class="badge badge-officer_recommended">LOS-POLICY-REVIEW (RAG Grounded)</span>
                      <span class="rec-badge" [class]="'rec-' + rec.recommendation.toLowerCase()">
                        Advisory: {{ rec.recommendation }}
                      </span>
                    </div>

                    <div class="rec-reasons">
                      <strong>Policy Findings & Reasons:</strong>
                      <ul>
                        @for (reason of rec.reasons; track reason) {
                          <li>{{ reason }}</li>
                        }
                      </ul>
                    </div>

                    @if (rec.citations.length > 0) {
                      <div class="citations-box">
                        <strong>Grounding Citations (Retrieved Policy Chunks):</strong>
                        @for (cit of rec.citations; track cit.policyChunkId) {
                          <div class="citation-tag">
                            <span class="cit-id">{{ cit.policyChunkId }}</span>
                            <span class="cit-quote">"{{ cit.quote }}"</span>
                          </div>
                        }
                      </div>
                    }

                    <div class="disclaimer-text">
                      <span class="material-icons">info</span>
                      <span>{{ rec.disclaimer }}</span>
                    </div>
                  </div>
                }
              </div>

              <!-- Request Clarification Drawer / Composer (LOS-FR-008) -->
              <div class="clarification-composer">
                <h4>Request Clarification from Applicant</h4>
                <div class="composer-form">
                  <textarea
                    [(ngModel)]="clarificationQuestion"
                    placeholder="Enter clarification question for the applicant..."
                    rows="2"
                  ></textarea>
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    (click)="sendClarification(app.id)"
                    [disabled]="!clarificationQuestion || actionLoading()"
                  >
                    <span class="material-icons">send</span> Send Clarification Request
                  </button>
                </div>

                @if (suggestedQuestions().length > 0) {
                  <div class="suggested-q-box">
                    <span class="suggested-title">AI Suggested Questions (Click to use):</span>
                    @for (sq of suggestedQuestions(); track sq) {
                      <button type="button" class="sq-pill" (click)="clarificationQuestion = sq">
                        {{ sq }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Officer Recommendation Action Form (LOS-FR-011) -->
              <div class="recommendation-form-card">
                <h4>Submit Officer Recommendation (LOS-FR-011)</h4>
                <p class="rec-note">Submit your formal underwriting assessment. This will advance the application to the Credit Manager decision queue.</p>

                <div class="rec-selector">
                  <label class="rec-option" [class.selected]="officerRec === 'PROCEED'">
                    <input type="radio" [(ngModel)]="officerRec" value="PROCEED" name="recGroup" />
                    <span class="material-icons icon-proceed">thumb_up</span>
                    <div>
                      <strong>PROCEED</strong>
                      <span>Eligible for Manager Approval</span>
                    </div>
                  </label>

                  <label class="rec-option" [class.selected]="officerRec === 'REVIEW'">
                    <input type="radio" [(ngModel)]="officerRec" value="REVIEW" name="recGroup" />
                    <span class="material-icons icon-review">help</span>
                    <div>
                      <strong>REVIEW</strong>
                      <span>Requires Exception / Manager Discretion</span>
                    </div>
                  </label>

                  <label class="rec-option" [class.selected]="officerRec === 'DECLINE'">
                    <input type="radio" [(ngModel)]="officerRec" value="DECLINE" name="recGroup" />
                    <span class="material-icons icon-decline">thumb_down</span>
                    <div>
                      <strong>DECLINE</strong>
                      <span>Recommends Rejection</span>
                    </div>
                  </label>
                </div>

                <div class="form-group">
                  <label>Officer Underwriting Rationale (Mandatory)</label>
                  <textarea
                    [(ngModel)]="officerRationale"
                    rows="3"
                    placeholder="Provide explicit reasons supporting your recommendation based on financial, KYC, and policy review..."
                  ></textarea>
                </div>

                <button
                  type="button"
                  class="btn btn-success btn-block"
                  (click)="submitOfficerRecommendation(app.id)"
                  [disabled]="!officerRationale || actionLoading()"
                >
                  <span class="material-icons">send</span> Submit Recommendation to Credit Manager
                </button>
              </div>
            </div>
          } @else {
            <div class="no-selection card">
              <span class="material-icons info-icon">assignment</span>
              <h3>Select Application from Queue</h3>
              <p>Click any application on the left to start underwriting inspection and AI policy review.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .officer-page {
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
    .header-tools {
      display: flex;
      gap: 12px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 6px 14px;
      width: 280px;
      input { border: none; outline: none; font-size: 13px; width: 100%; font-family: inherit; }
      .material-icons { font-size: 18px; color: #94a3b8; }
    }
    .queue-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .queue-tab {
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      &.active {
        color: #2563eb;
        border-color: #2563eb;
      }
    }
    .officer-grid {
      display: grid;
      grid-template-columns: 480px 1fr;
      gap: 24px;
    }
    .queue-card {
      padding: 0;
      overflow: hidden;
      height: fit-content;
    }
    .queue-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
      th {
        background: #f8fafc;
        padding: 12px 14px;
        font-weight: 700;
        color: #475569;
        border-bottom: 1px solid var(--border);
      }
      td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }
      tr {
        cursor: pointer;
        transition: background 0.15s;
        &:hover { background: #f1f5f9; }
        &.selected { background: #eff6ff; }
      }
      .applicant-cell-name { font-weight: 700; color: #0f172a; display: block; }
      .applicant-cell-sub { font-size: 11px; color: #64748b; }
      .btn-xs { padding: 4px 8px; font-size: 11px; border-radius: 6px; }
      .no-records { text-align: center; padding: 40px; color: #94a3b8; }
    }
    .dossier-card {
      padding: 28px;
    }
    .dossier-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      .dossier-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        h3 { font-size: 20px; font-weight: 800; color: #0f172a; }
      }
      .dossier-meta { font-size: 12px; color: #64748b; }
      .dossier-actions-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
    .dossier-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .d-stat {
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      .d-stat-label { font-size: 11px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px; }
      .d-stat-val { font-size: 18px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 2px; }
      .d-stat-sub { font-size: 11px; color: #94a3b8; }
    }
    .eligibility-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
      .eligibility-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #1e3a8a;
        margin-bottom: 10px;
        .material-icons { font-size: 18px; }
      }
      .eligibility-result {
        padding: 12px 14px;
        border-radius: 8px;
        &.passed {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
        }
        &.failed {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }
        .res-status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          .codes-list { font-size: 12px; font-weight: 700; }
        }
        .res-details {
          font-size: 12px;
          color: #475569;
        }
      }
    }
    .doc-inspector {
      margin-bottom: 20px;
      h4 { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }
      .docs-row { display: flex; flex-wrap: wrap; gap: 10px; }
      .doc-badge-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8fafc;
        border: 1px solid var(--border);
        border-radius: 8px;
        .material-icons { color: #dc2626; font-size: 20px; }
        .doc-b-info {
          display: flex;
          flex-direction: column;
          strong { font-size: 12px; color: #0f172a; }
          span { font-size: 10px; color: #64748b; }
        }
      }
    }
    .ai-copilot-panel {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .copilot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      .copilot-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #1e3a8a;
        h4 { font-size: 15px; font-weight: 800; }
        .material-icons { font-size: 22px; color: #2563eb; }
      }
      .copilot-actions { display: flex; gap: 8px; }
    }
    .ai-output-box {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-top: 14px;
      .ai-out-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .summary-text { font-size: 13px; line-height: 1.6; color: #1e293b; margin-bottom: 12px; }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        font-size: 12px;
        ul { padding-left: 16px; margin-top: 4px; }
        li { margin-bottom: 2px; }
      }
      &.policy-box {
        border-color: #f5d0fe;
        background: #fdf4ff;
      }
      .rec-badge {
        font-weight: 800;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 6px;
        &.rec-proceed { background: #dcfce7; color: #15803d; }
        &.rec-review { background: #fef3c7; color: #b45309; }
        &.rec-decline { background: #fee2e2; color: #b91c1c; }
      }
      .citations-box {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px dashed #e9d5ff;
        font-size: 12px;
      }
      .citation-tag {
        margin-top: 4px;
        font-size: 11px;
        background: #ffffff;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid #f0abfc;
        .cit-id { font-weight: 700; color: #a21caf; margin-right: 6px; }
        .cit-quote { color: #475569; font-style: italic; }
      }
      .disclaimer-text {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #701a75;
        margin-top: 12px;
        font-weight: 600;
        .material-icons { font-size: 14px; }
      }
    }
    .clarification-composer {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
      h4 { font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 8px; }
      .composer-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        textarea {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-family: inherit;
        }
      }
      .suggested-q-box {
        margin-top: 10px;
        .suggested-title { font-size: 11px; font-weight: 700; color: #b45309; display: block; margin-bottom: 6px; }
      }
      .sq-pill {
        display: block;
        width: 100%;
        text-align: left;
        background: #ffffff;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
        color: #78350f;
        cursor: pointer;
        margin-bottom: 4px;
        &:hover { background: #fef3c7; }
      }
    }
    .recommendation-form-card {
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
      h4 { font-size: 16px; font-weight: 800; color: #1e3a8a; margin-bottom: 4px; }
      .rec-note { font-size: 12px; color: #64748b; margin-bottom: 16px; }
      .rec-selector {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 18px;
      }
      .rec-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border);
        cursor: pointer;
        background: #f8fafc;
        input { display: none; }
        strong { display: block; font-size: 13px; }
        span { font-size: 11px; color: #64748b; }
        &.selected {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 0 0 2px #2563eb;
        }
        .icon-proceed { color: #15803d; }
        .icon-review { color: #d97706; }
        .icon-decline { color: #b91c1c; }
      }
      .btn-block { width: 100%; height: 44px; font-size: 15px; }
    }
    .no-selection {
      padding: 80px 24px;
      text-align: center;
      .info-icon { font-size: 48px; color: #94a3b8; margin-bottom: 12px; }
      h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
      p { font-size: 14px; color: #64748b; }
    }
  `]
})
export class OfficerDashboardComponent implements OnInit {
  queue = signal<LoanApplication[]>([]);
  filteredQueue = signal<LoanApplication[]>([]);
  selectedApp = signal<LoanApplication | null>(null);
  documents = signal<LoanDocument[]>([]);
  clarifications = signal<Clarification[]>([]);
  eligibilityResult = signal<EligibilityResult | null>(null);

  aiSummary = signal<AiSummary | null>(null);
  aiRecommendation = signal<AiRecommendationResult | null>(null);
  suggestedQuestions = signal<string[]>([]);

  activeTab = signal<string>('ALL');
  searchQuery = '';
  actionLoading = signal(false);
  loadingAiSummary = signal(false);
  loadingAiRec = signal(false);

  clarificationQuestion = '';
  officerRec: 'PROCEED' | 'REVIEW' | 'DECLINE' = 'PROCEED';
  officerRationale = '';

  // Tab counts
  readonly submittedCount = computed(() =>
    this.queue().filter((a) => ['SUBMITTED', 'RESUBMITTED'].includes(a.status)).length,
  );
  readonly inReviewCount = computed(() =>
    this.queue().filter((a) => a.status === 'UNDER_REVIEW').length,
  );
  readonly clarificationCount = computed(() =>
    this.queue().filter((a) => a.status === 'CLARIFICATION_REQUIRED').length,
  );
  readonly recommendedCount = computed(() =>
    this.queue().filter((a) => a.status === 'OFFICER_RECOMMENDED').length,
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
        this.filterQueue();
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
          this.selectApplication(apps[0]);
        }
      },
      error: () => {},
    });
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.filterQueue();
  }

  filterQueue(): void {
    let list = this.queue();
    const tab = this.activeTab();

    if (tab === 'SUBMITTED') {
      list = list.filter((a) => ['SUBMITTED', 'RESUBMITTED'].includes(a.status));
    } else if (tab === 'UNDER_REVIEW') {
      list = list.filter((a) => a.status === 'UNDER_REVIEW');
    } else if (tab === 'CLARIFICATION_REQUIRED') {
      list = list.filter((a) => a.status === 'CLARIFICATION_REQUIRED');
    } else if (tab === 'OFFICER_RECOMMENDED') {
      list = list.filter((a) => a.status === 'OFFICER_RECOMMENDED');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.id.toString().includes(q) ||
          (a.applicantName && a.applicantName.toLowerCase().includes(q)),
      );
    }

    this.filteredQueue.set(list);
  }

  selectApplication(app: LoanApplication): void {
    this.selectedApp.set(app);
    this.aiSummary.set(null);
    this.aiRecommendation.set(null);
    this.suggestedQuestions.set([]);
    this.eligibilityResult.set(null);
    this.clarificationQuestion = '';
    this.officerRationale = '';

    this.loadDocuments(app.id);
    this.loadClarifications(app.id);
    this.evaluateEligibility(app.id);
  }

  loadDocuments(appId: number): void {
    this.api.getDocuments(appId).subscribe({
      next: (docs) => this.documents.set(docs),
      error: () => this.documents.set([]),
    });
  }

  loadClarifications(appId: number): void {
    this.api.getClarifications(appId).subscribe({
      next: (clars) => this.clarifications.set(clars),
      error: () => this.clarifications.set([]),
    });
  }

  evaluateEligibility(appId: number): void {
    this.api.checkEligibility(appId).subscribe({
      next: (res) => this.eligibilityResult.set(res),
      error: () => {},
    });
  }

  startReview(appId: number): void {
    this.actionLoading.set(true);
    this.api.startReview(appId).subscribe({
      next: (updated) => {
        this.selectedApp.set(updated);
        this.actionLoading.set(false);
        this.loadQueue();
      },
      error: () => this.actionLoading.set(false),
    });
  }

  generateAiSummary(appId: number): void {
    this.loadingAiSummary.set(true);
    this.api.generateAiSummary(appId).subscribe({
      next: (sum) => {
        this.aiSummary.set(sum);
        this.loadingAiSummary.set(false);
      },
      error: (err) => {
        alert('AI Summary: ' + (err?.error?.message || err.message));
        this.loadingAiSummary.set(false);
      },
    });
  }

  generateAiRecommendation(appId: number): void {
    this.loadingAiRec.set(true);
    this.api.generateAiRecommendation(appId).subscribe({
      next: (rec) => {
        this.aiRecommendation.set(rec);
        this.loadingAiRec.set(false);
        // Pre-fill officer recommendation with AI advisory suggestion
        if (rec.recommendation) {
          this.officerRec = rec.recommendation;
          this.officerRationale = rec.reasons?.join('. ') || 'Aligned with AI policy findings.';
        }
      },
      error: (err) => {
        alert('AI Recommendation: ' + (err?.error?.message || err.message));
        this.loadingAiRec.set(false);
      },
    });
  }

  draftClarificationWithAi(appId: number): void {
    this.api.draftClarification(appId).subscribe({
      next: (res) => {
        this.suggestedQuestions.set(res.suggestedQuestions);
        if (res.suggestedQuestions.length > 0) {
          this.clarificationQuestion = res.suggestedQuestions[0];
        }
      },
      error: () => {},
    });
  }

  sendClarification(appId: number): void {
    if (!this.clarificationQuestion) return;
    this.actionLoading.set(true);
    this.api
      .createClarification(appId, { question: this.clarificationQuestion })
      .subscribe({
        next: () => {
          this.clarificationQuestion = '';
          this.actionLoading.set(false);
          this.loadQueue();
          this.loadClarifications(appId);
        },
        error: (err) => {
          alert('Error requesting clarification: ' + (err?.error?.message || err.message));
          this.actionLoading.set(false);
        },
      });
  }

  submitOfficerRecommendation(appId: number): void {
    if (!this.officerRationale) return;
    this.actionLoading.set(true);
    this.api
      .createReview(appId, {
        recommendation: this.officerRec,
        rationale: this.officerRationale,
      })
      .subscribe({
        next: () => {
          alert(`Officer recommendation (${this.officerRec}) recorded. Application queued for Credit Manager.`);
          this.actionLoading.set(false);
          this.loadQueue();
        },
        error: (err) => {
          alert('Failed to submit review: ' + (err?.error?.message || err.message));
          this.actionLoading.set(false);
        },
      });
  }
}
