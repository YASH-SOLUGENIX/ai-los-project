import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Clarification,
  LoanApplication,
  LoanDocument,
  LoanProduct,
} from '../../core/models/models';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard-page animate-fade-in">
      <!-- Welcome Hero -->
      <div class="hero-banner">
        <div class="hero-content">
          <div class="user-greeting">
            <h1>Welcome, {{ auth.currentUser()?.firstName || auth.currentUser()?.username }}!</h1>
            <p>Track your active applications, upload documentation, and apply for personal financing.</p>
          </div>
          <button type="button" class="btn btn-apply" (click)="openApplyModal()">
            <span class="material-icons">add_circle</span> Apply for a Loan
          </button>
        </div>
      </div>

      <!-- Available Loan Categories Showcase -->
      @if (products().length > 0) {
        <div class="products-showcase-section">
          <div class="showcase-header">
            <h3>Available Loan Categories</h3>
            <p>Explore approved retail financing products and apply instantly with automated underwriting.</p>
          </div>
          <div class="products-grid">
            @for (prod of products(); track prod.id) {
              <div class="product-tile card">
                <div class="p-tile-header">
                  <span class="p-badge-tag">{{ prod.code }}</span>
                  <span class="p-tile-rate">{{ prod.interestRate }}% p.a.</span>
                </div>
                <h4>{{ prod.name }}</h4>
                <p class="p-tile-desc">{{ prod.description }}</p>
                <div class="p-tile-meta">
                  <div>
                    <span class="lbl">Borrow Up To</span>
                    <span class="val">₹{{ formatCurrency(prod.maxAmount) }}</span>
                  </div>
                  <div>
                    <span class="lbl">Max Tenure</span>
                    <span class="val">{{ prod.maxTenureMonths }} Months</span>
                  </div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" (click)="openApplyModal(prod.id)">
                  <span class="material-icons">arrow_forward</span> Apply for {{ prod.name }}
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Quick Metrics -->
      <div class="metrics-grid">
        <div class="metric-card card">
          <div class="metric-icon icon-blue"><span class="material-icons">description</span></div>
          <div class="metric-info">
            <span class="metric-value">{{ applications().length }}</span>
            <span class="metric-label">Total Applications</span>
          </div>
        </div>

        <div class="metric-card card">
          <div class="metric-icon icon-amber"><span class="material-icons">pending_actions</span></div>
          <div class="metric-info">
            <span class="metric-value">{{ pendingCount() }}</span>
            <span class="metric-label">In Review / Processing</span>
          </div>
        </div>

        <div class="metric-card card">
          <div class="metric-icon icon-orange"><span class="material-icons">help_outline</span></div>
          <div class="metric-info">
            <span class="metric-value">{{ clarificationCount() }}</span>
            <span class="metric-label">Needs Clarification</span>
          </div>
        </div>

        <div class="metric-card card">
          <div class="metric-icon icon-green"><span class="material-icons">check_circle</span></div>
          <div class="metric-info">
            <span class="metric-value">{{ approvedCount() }}</span>
            <span class="metric-label">Approved Loans</span>
          </div>
        </div>
      </div>

      <!-- Main Layout: Applications List & Selected Application Details -->
      <div class="main-content-grid">
        <!-- Left Column: Applications List -->
        <div class="applications-section card">
          <div class="section-header">
            <h3>My Applications</h3>
            <button type="button" class="btn-refresh" (click)="loadApplications()" title="Refresh">
              <span class="material-icons">refresh</span>
            </button>
          </div>

          @if (loadingApps()) {
            <div class="loading-state">
              <span class="material-icons spin">sync</span> Loading applications...
            </div>
          } @else if (applications().length === 0) {
            <div class="empty-state">
              <span class="material-icons empty-icon">folder_open</span>
              <h4>No applications yet</h4>
              <p>You have not submitted any loan applications. Click below to begin.</p>
              <button type="button" class="btn btn-primary" (click)="openApplyModal()">
                Apply for Loan
              </button>
            </div>
          } @else {
            <div class="app-list">
              @for (app of applications(); track app.id) {
                <div
                  class="app-item"
                  [class.selected]="selectedApp()?.id === app.id"
                  (click)="selectApplication(app)"
                >
                  <div class="app-item-top">
                    <span class="app-id">APP-#{{ app.id }}</span>
                    <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                      {{ formatStatus(app.status) }}
                    </span>
                  </div>
                  <div class="app-item-details">
                    <span class="app-amount">₹{{ formatCurrency(app.requestedAmount) }}</span>
                    <span class="app-tenure">{{ app.requestedTenureMonths }} Months</span>
                  </div>
                  <div class="app-item-footer">
                    <span class="app-date">{{ app.createdAt | date:'mediumDate' }}</span>
                    <span class="material-icons chevron">chevron_right</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Right Column: Detail Dossier for Selected Application -->
        <div class="detail-section">
          @if (selectedApp(); as app) {
            <div class="detail-card card animate-fade-in">
              <!-- Detail Header -->
              <div class="detail-header">
                <div>
                  <div class="title-row">
                    <h2>Application #{{ app.id }}</h2>
                    <span class="badge" [class]="'badge-' + app.status.toLowerCase()">
                      {{ formatStatus(app.status) }}
                    </span>
                  </div>
                  <p class="subtitle">Created on {{ app.createdAt | date:'fullDate' }}</p>
                </div>

                @if (app.status === 'DRAFT') {
                  <button
                    type="button"
                    class="btn btn-success"
                    (click)="submitApplication(app.id)"
                    [disabled]="actionLoading()"
                  >
                    <span class="material-icons">send</span> Submit Application
                  </button>
                }
              </div>

              <!-- Visual Status Pipeline Stepper -->
              <div class="status-stepper">
                <div class="step" [class.completed]="isStepCompleted(app.status, 'DRAFT')" [class.current]="app.status === 'DRAFT'">
                  <div class="step-circle"><span class="material-icons">edit_note</span></div>
                  <span class="step-title">Draft</span>
                </div>
                <div class="step-line" [class.active]="isStepCompleted(app.status, 'SUBMITTED')"></div>

                <div class="step" [class.completed]="isStepCompleted(app.status, 'SUBMITTED')" [class.current]="app.status === 'SUBMITTED'">
                  <div class="step-circle"><span class="material-icons">mark_email_read</span></div>
                  <span class="step-title">Submitted</span>
                </div>
                <div class="step-line" [class.active]="isStepCompleted(app.status, 'UNDER_REVIEW')"></div>

                <div class="step" [class.completed]="isStepCompleted(app.status, 'UNDER_REVIEW')" [class.current]="app.status === 'UNDER_REVIEW' || app.status === 'CLARIFICATION_REQUIRED' || app.status === 'RESUBMITTED'">
                  <div class="step-circle"><span class="material-icons">rate_review</span></div>
                  <span class="step-title">Underwriting</span>
                </div>
                <div class="step-line" [class.active]="isStepCompleted(app.status, 'OFFICER_RECOMMENDED')"></div>

                <div class="step" [class.completed]="isStepCompleted(app.status, 'OFFICER_RECOMMENDED')" [class.current]="app.status === 'OFFICER_RECOMMENDED'">
                  <div class="step-circle"><span class="material-icons">fact_check</span></div>
                  <span class="step-title">Recommended</span>
                </div>
                <div class="step-line" [class.active]="app.status === 'MANAGER_APPROVED' || app.status === 'MANAGER_REJECTED'"></div>

                <div class="step" [class.completed]="app.status === 'MANAGER_APPROVED'" [class.rejected]="app.status === 'MANAGER_REJECTED'">
                  <div class="step-circle">
                    <span class="material-icons">{{ app.status === 'MANAGER_REJECTED' ? 'cancel' : 'verified' }}</span>
                  </div>
                  <span class="step-title">{{ app.status === 'MANAGER_REJECTED' ? 'Declined' : 'Decision' }}</span>
                </div>
              </div>

              <!-- AI Status Explainer Box (LOS-EXPLAIN) -->
              <div class="ai-explainer-box">
                <div class="ai-box-header">
                  <div class="ai-tag">
                    <span class="material-icons">psychology</span>
                    <span>AI Status Assistant (LOS-EXPLAIN)</span>
                  </div>
                  <button type="button" class="btn-text" (click)="loadAiExplanation(app.id)" [disabled]="loadingAiExplain()">
                    <span class="material-icons">refresh</span> Re-analyze
                  </button>
                </div>

                @if (loadingAiExplain()) {
                  <p class="ai-loading"><span class="material-icons spin">hourglass_empty</span> Formulating plain-language status explanation...</p>
                } @else if (aiExplanation()) {
                  <p class="ai-text">{{ aiExplanation()?.explanation }}</p>
                  <div class="ai-next-steps">
                    <strong>Next Steps:</strong> {{ aiExplanation()?.nextSteps }}
                  </div>
                }
              </div>

              <!-- Clarification Alert & Inbox (LOS-FR-008) -->
              @if (app.status === 'CLARIFICATION_REQUIRED' || clarifications().length > 0) {
                <div class="clarification-panel">
                  <div class="panel-header">
                    <span class="material-icons alert-icon">help</span>
                    <h4>Underwriting Clarification Requests</h4>
                  </div>

                  @for (c of clarifications(); track c.id) {
                    <div class="clarification-card" [class.open]="c.status === 'OPEN'">
                      <div class="q-row">
                        <span class="q-badge">Question from Loan Officer</span>
                        <span class="badge" [class.badge-under_review]="c.status === 'OPEN'" [class.badge-manager_approved]="c.status === 'RESPONDED'">
                          {{ c.status }}
                        </span>
                      </div>
                      <p class="q-text">{{ c.question }}</p>

                      @if (c.status === 'OPEN') {
                        <div class="response-form">
                          <textarea
                            [(ngModel)]="clarificationResponse"
                            placeholder="Type your response to the loan officer's request..."
                            rows="3"
                          ></textarea>
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="respondToClarification(c.id)"
                            [disabled]="!clarificationResponse || actionLoading()"
                          >
                            <span class="material-icons">send</span> Submit Response & Resubmit
                          </button>
                        </div>
                      } @else {
                        <div class="answered-box">
                          <strong>Your Submitted Response:</strong>
                          <p>{{ c.customerResponse }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Financial & Profile Summary -->
              <div class="info-grid">
                <div class="info-card">
                  <span class="info-label">Requested Loan</span>
                  <span class="info-value">₹{{ formatCurrency(app.requestedAmount) }}</span>
                  <span class="info-sub">{{ app.requestedTenureMonths }} Months Tenure</span>
                </div>

                <div class="info-card">
                  <span class="info-label">Monthly Take-Home</span>
                  <span class="info-value">₹{{ formatCurrency(app.monthlyIncome) }}</span>
                  <span class="info-sub">{{ app.employmentType || 'Salaried' }} ({{ app.employerName || 'Not specified' }})</span>
                </div>

                <div class="info-card">
                  <span class="info-label">Existing Obligations</span>
                  <span class="info-value">₹{{ formatCurrency(app.monthlyObligations) }}</span>
                  <span class="info-sub">Reported EMIs & Liabilities</span>
                </div>

                <div class="info-card">
                  <span class="info-label">Applicant Age</span>
                  <span class="info-value">{{ app.applicantAge || 25 }} Years</span>
                  <span class="info-sub">Eligible (21+ Standard)</span>
                </div>
              </div>

              <!-- Uploaded Documents Checklist (LOS-FR-006) -->
              <div class="documents-section">
                <div class="section-header">
                  <h4>Required Verification Documents</h4>
                  @if (app.status === 'DRAFT') {
                    <label class="btn btn-secondary btn-sm upload-btn">
                      <input type="file" (change)="onFileSelected($event, app.id)" accept="application/pdf" hidden />
                      <span class="material-icons">upload_file</span> Upload Salary Slip (PDF)
                    </label>
                  }
                </div>

                @if (documents().length === 0) {
                  <div class="document-warning">
                    <span class="material-icons">warning</span>
                    <div>
                      <strong>Missing Mandatory Document: SALARY_SLIP</strong>
                      <p>Under BFSI rules (LOS-BR-04), an application cannot be submitted until your official salary slip PDF is uploaded.</p>
                    </div>
                  </div>
                } @else {
                  <div class="doc-list">
                    @for (doc of documents(); track doc.id) {
                      <div class="doc-item">
                        <div class="doc-icon"><span class="material-icons">picture_as_pdf</span></div>
                        <div class="doc-info">
                          <span class="doc-name">{{ doc.originalFileName }}</span>
                          <span class="doc-meta">
                            {{ doc.documentType }} • {{ (doc.fileSize / 1024).toFixed(1) }} KB • Uploaded {{ doc.uploadedAt | date:'short' }}
                          </span>
                        </div>
                        <div class="doc-status">
                          <span class="badge badge-manager_approved">Verified PDF</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="no-selection card">
              <span class="material-icons info-icon">touch_app</span>
              <h3>Select an Application</h3>
              <p>Choose an application from the left to inspect status, AI analysis, documents, and notifications.</p>
            </div>
          }
        </div>
      </div>

      <!-- Application Modal / Wizard -->
      @if (showApplyModal()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-card card">
            <div class="modal-header">
              <div>
                <h2>Apply for {{ selectedProductName() }}</h2>
                <p>Complete the form below to initiate your digital loan application.</p>
              </div>
              <button type="button" class="btn-close" (click)="closeApplyModal()">
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="modal-body">
              <!-- Wizard Stepper Header -->
              <div class="wizard-tabs">
                <button
                  type="button"
                  class="wizard-tab"
                  [class.active]="wizardStep() === 1"
                  (click)="wizardStep.set(1)"
                >
                  1. Loan Amount & Calculator
                </button>
                <button
                  type="button"
                  class="wizard-tab"
                  [class.active]="wizardStep() === 2"
                  (click)="wizardStep.set(2)"
                >
                  2. Employment & Income
                </button>
                <button
                  type="button"
                  class="wizard-tab"
                  [class.active]="wizardStep() === 3"
                  (click)="wizardStep.set(3)"
                >
                  3. Document Upload
                </button>
              </div>

              <!-- Step 1: Calculator -->
              @if (wizardStep() === 1) {
                <div class="wizard-step-content animate-fade-in">
                  <div class="form-group">
                    <label>Choose Loan Category / Product</label>
                    <div class="product-category-grid">
                      @for (p of products(); track p.id) {
                        <div
                          class="product-category-card"
                          [class.selected]="newApp.loanProductId === p.id"
                          (click)="selectProduct(p)"
                        >
                          <div class="p-card-top">
                            <span class="p-code">{{ p.code }}</span>
                            <span class="p-rate">{{ p.interestRate }}% p.a.</span>
                          </div>
                          <div class="p-name">{{ p.name }}</div>
                          <div class="p-desc">{{ p.description }}</div>
                          <div class="p-limits">
                            <span>₹{{ formatCurrency(p.minAmount) }} - ₹{{ formatCurrency(p.maxAmount) }}</span>
                            <span>{{ p.minTenureMonths }}-{{ p.maxTenureMonths }}m</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="form-group">
                    <div class="range-header">
                      <label>Requested Loan Amount</label>
                      <span class="range-value-pill">₹{{ formatCurrency(newApp.requestedAmount) }}</span>
                    </div>
                    <input
                      type="range"
                      [min]="selectedProduct()?.minAmount || 25000"
                      [max]="selectedProduct()?.maxAmount || 1500000"
                      step="5000"
                      [(ngModel)]="newApp.requestedAmount"
                      (input)="onAmountChange($event)"
                    />
                    <div class="range-labels">
                      <span>₹{{ formatCurrency(selectedProduct()?.minAmount || 25000) }}</span>
                      <span>₹{{ formatCurrency(selectedProduct()?.maxAmount || 1500000) }}</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <div class="range-header">
                      <label>Requested Tenure</label>
                      <span class="range-value-pill">{{ newApp.requestedTenureMonths }} Months</span>
                    </div>
                    <input
                      type="range"
                      [min]="selectedProduct()?.minTenureMonths || 6"
                      [max]="selectedProduct()?.maxTenureMonths || 60"
                      step="6"
                      [(ngModel)]="newApp.requestedTenureMonths"
                      (input)="onTenureChange($event)"
                    />
                    <div class="range-labels">
                      <span>{{ selectedProduct()?.minTenureMonths || 6 }} Mos</span>
                      <span>{{ selectedProduct()?.maxTenureMonths || 60 }} Mos</span>
                    </div>
                  </div>

                  <!-- Live EMI Box -->
                  <div class="emi-preview-box">
                    <div>
                      <span class="emi-label">Estimated Monthly EMI</span>
                      <span class="emi-amount">₹{{ formatCurrency(calculatedEmi()) }}</span>
                      <span class="emi-sub">Calculated at {{ selectedProductRate() }}% p.a. policy interest</span>
                    </div>
                    <div class="emi-circle">
                      <span class="material-icons">calculate</span>
                    </div>
                  </div>
                </div>
              }

              <!-- Step 2: Financial Details -->
              @if (wizardStep() === 2) {
                <div class="wizard-step-content animate-fade-in">
                  <div class="form-group">
                    <label>Full Legal Name</label>
                    <input type="text" [(ngModel)]="newApp.applicantName" placeholder="Enter your full name" />
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Age (Years)</label>
                      <input type="number" [(ngModel)]="newApp.applicantAge" min="21" max="65" />
                      <span class="hint">Minimum age is 21 years</span>
                    </div>

                    <div class="form-group">
                      <label>Employment Type</label>
                      <select [(ngModel)]="newApp.employmentType">
                        <option value="SALARIED">Salaried Employee</option>
                        <option value="SELF_EMPLOYED">Self-Employed Professional</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Current Employer Name</label>
                    <input type="text" [(ngModel)]="newApp.employerName" placeholder="e.g. Acme Financial Technologies" />
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Net Monthly Income (₹)</label>
                      <input type="number" [(ngModel)]="newApp.monthlyIncome" step="1000" (input)="onIncomeChange($event)" />
                    </div>

                    <div class="form-group">
                      <label>Existing Monthly Obligations / EMIs (₹)</label>
                      <input type="number" [(ngModel)]="newApp.monthlyObligations" step="500" (input)="onObligationsChange($event)" />
                    </div>
                  </div>

                  <!-- Projected DTI indicator -->
                  <div class="dti-preview-bar">
                    <div class="dti-header">
                      <span>Estimated Debt-To-Income (DTI) Ratio</span>
                      <strong [class.text-danger]="projectedDti() > 50">{{ projectedDti() }}%</strong>
                    </div>
                    <div class="bar-bg">
                      <div class="bar-fill" [style.width.%]="projectedDti() > 100 ? 100 : projectedDti()" [class.bar-danger]="projectedDti() > 50"></div>
                    </div>
                    <span class="hint">BFSI policy threshold: Maximum 50% DTI</span>
                  </div>
                </div>
              }

              <!-- Step 3: Document Upload -->
              @if (wizardStep() === 3) {
                <div class="wizard-step-content animate-fade-in">
                  <div class="upload-dropzone">
                    <span class="material-icons drop-icon">cloud_upload</span>
                    <h4>Upload Proof of Income (Salary Slip)</h4>
                    <p>Format: PDF only (Max 5MB). Official computer-generated statement.</p>

                    <label class="btn btn-primary upload-btn">
                      <input type="file" (change)="onModalFileSelected($event)" accept="application/pdf" hidden />
                      <span class="material-icons">attach_file</span> Choose PDF Document
                    </label>

                    @if (selectedFile) {
                      <div class="selected-file-badge">
                        <span class="material-icons">check_circle</span>
                        <span>{{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeApplyModal()">Cancel</button>

              <div class="wizard-nav-btns">
                @if (wizardStep() > 1) {
                  <button type="button" class="btn btn-secondary" (click)="wizardStep.set(wizardStep() - 1)">
                    Previous
                  </button>
                }
                @if (wizardStep() < 3) {
                  <button type="button" class="btn btn-primary" (click)="wizardStep.set(wizardStep() + 1)">
                    Next Step
                  </button>
                }
                @if (wizardStep() === 3) {
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="createAndSubmitApplication(true)"
                    [disabled]="actionLoading()"
                  >
                    <span class="material-icons">save</span> Save as Draft
                  </button>
                  <button
                    type="button"
                    class="btn btn-success"
                    (click)="createAndSubmitApplication(false)"
                    [disabled]="actionLoading() || !selectedFile"
                  >
                    <span class="material-icons">send</span> Submit Application
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .hero-banner {
      background: linear-gradient(135deg, #1e3a8a, #1e40af);
      border-radius: var(--radius-lg);
      padding: 36px 40px;
      color: #ffffff;
      margin-bottom: 28px;
      box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.3);
    }
    .hero-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .user-greeting h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .user-greeting p {
      font-size: 15px;
      color: #bfdbfe;
    }
    .btn-apply {
      background: #ffffff;
      color: #1e3a8a;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
      &:hover { background: #f8fafc; transform: translateY(-1px); }
    }
    .products-showcase-section {
      margin-bottom: 28px;
      .showcase-header {
        margin-bottom: 16px;
        h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
        p { font-size: 13px; color: #64748b; margin: 0; }
      }
      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      .product-tile {
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: 12px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
        }
        .p-tile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          .p-badge-tag {
            font-size: 11px;
            font-weight: 700;
            color: #2563eb;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 2px 8px;
            border-radius: 12px;
          }
          .p-tile-rate { font-size: 13px; font-weight: 700; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 12px; }
        }
        h4 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 4px 0; }
        .p-tile-desc { font-size: 12px; color: #64748b; margin: 0 0 14px 0; line-height: 1.4; flex: 1; }
        .p-tile-meta {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 14px;
          .lbl { font-size: 11px; color: #94a3b8; display: block; }
          .val { font-size: 13px; font-weight: 700; color: #1e293b; }
        }
        button { width: 100%; justify-content: center; }
      }
    }
    .product-category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 8px;
    }
    .product-category-card {
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.2s ease;
      &:hover { border-color: #93c5fd; background: #f8fafc; }
      &.selected {
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 0 0 1px #2563eb;
      }
      .p-card-top {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 4px;
        .p-code { font-weight: 700; color: #2563eb; }
        .p-rate { font-weight: 700; color: #15803d; }
      }
      .p-name { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
      .p-desc { font-size: 11px; color: #64748b; line-height: 1.3; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .p-limits {
        font-size: 10px;
        color: #475569;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
      }
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }
    .metric-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      .material-icons { font-size: 26px; }
      &.icon-blue { background: #eff6ff; color: #2563eb; }
      &.icon-amber { background: #fef3c7; color: #d97706; }
      &.icon-orange { background: #fff7ed; color: #ea580c; }
      &.icon-green { background: #ecfdf5; color: #059669; }
    }
    .metric-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      display: block;
      line-height: 1.1;
    }
    .metric-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .main-content-grid {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 24px;
    }
    .applications-section {
      padding: 20px;
      height: fit-content;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      h3, h4 { font-size: 16px; font-weight: 700; color: #0f172a; }
      .btn-refresh {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        &:hover { background: #f1f5f9; color: #0f172a; }
      }
    }
    .app-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .app-item {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: #ffffff;
        border-color: #cbd5e1;
        box-shadow: var(--shadow-sm);
      }
      &.selected {
        background: #eff6ff;
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }
    }
    .app-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .app-id {
      font-weight: 700;
      font-size: 13px;
      color: #1e3a8a;
    }
    .app-item-details {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .app-amount {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .app-tenure {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .app-item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .detail-card {
      padding: 32px;
    }
    .detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
      .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        h2 { font-size: 22px; font-weight: 800; color: #0f172a; }
      }
      .subtitle { font-size: 13px; color: #64748b; }
    }
    .status-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      padding: 16px 20px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      .step-circle {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        .material-icons { font-size: 20px; }
      }
      .step-title {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      &.completed .step-circle {
        background: #10b981;
        color: #ffffff;
      }
      &.current .step-circle {
        background: #2563eb;
        color: #ffffff;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
      }
      &.rejected .step-circle {
        background: #ef4444;
        color: #ffffff;
      }
    }
    .step-line {
      flex: 1;
      height: 3px;
      background: #e2e8f0;
      margin: 0 10px 18px;
      &.active { background: #10b981; }
    }
    .ai-explainer-box {
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .ai-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      .ai-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #15803d;
        text-transform: uppercase;
      }
      .btn-text {
        background: transparent;
        border: none;
        color: #15803d;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        .material-icons { font-size: 14px; }
      }
    }
    .ai-text {
      font-size: 14px;
      color: #14532d;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .ai-next-steps {
      font-size: 13px;
      color: #166534;
      background: rgba(255, 255, 255, 0.7);
      padding: 8px 12px;
      border-radius: 6px;
    }
    .clarification-panel {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      .panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c2410c;
        margin-bottom: 14px;
        h4 { font-size: 15px; font-weight: 700; }
      }
    }
    .clarification-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #fed7aa;
      margin-bottom: 12px;
      .q-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        .q-badge { font-size: 11px; font-weight: 700; color: #9a3412; }
      }
      .q-text { font-size: 14px; color: #1e293b; font-weight: 500; margin-bottom: 12px; }
      textarea {
        width: 100%;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-size: 13px;
        font-family: inherit;
        margin-bottom: 8px;
      }
      .answered-box {
        background: #f8fafc;
        padding: 10px;
        border-radius: 6px;
        font-size: 13px;
        strong { color: #475569; display: block; margin-bottom: 4px; }
        p { color: #0f172a; margin: 0; }
      }
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .info-card {
      background: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .info-label { font-size: 11px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px; }
    .info-value { font-size: 16px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 2px; }
    .info-sub { font-size: 11px; color: #94a3b8; }
    .documents-section {
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }
    .document-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: #92400e;
      .material-icons { font-size: 24px; color: #d97706; }
      strong { font-size: 14px; display: block; margin-bottom: 2px; }
      p { font-size: 13px; margin: 0; }
    }
    .doc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .doc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid var(--border);
      .doc-icon { color: #dc2626; .material-icons { font-size: 24px; } }
      .doc-info { flex: 1; }
      .doc-name { font-size: 13px; font-weight: 600; color: #0f172a; display: block; }
      .doc-meta { font-size: 11px; color: #64748b; }
    }
    .no-selection {
      padding: 80px 24px;
      text-align: center;
      .info-icon { font-size: 48px; color: #94a3b8; margin-bottom: 12px; }
      h3 { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
      p { font-size: 14px; color: #64748b; }
    }
    /* Modal styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 24px;
    }
    .modal-card {
      width: 100%;
      max-width: 650px;
      background: #ffffff;
      padding: 32px;
      border-radius: 20px;
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin: 0; }
      .btn-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        &:hover { color: #0f172a; }
      }
    }
    .wizard-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .wizard-tab {
      flex: 1;
      padding: 10px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      &.active {
        color: #2563eb;
        border-color: #2563eb;
      }
    }
    .range-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .range-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .range-value-pill {
      font-size: 13px;
      font-weight: 700;
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .emi-preview-box {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 20px;
      .emi-label { font-size: 12px; font-weight: 600; color: #1e40af; display: block; }
      .emi-amount { font-size: 26px; font-weight: 800; color: #1e3a8a; display: block; line-height: 1.1; margin: 4px 0; }
      .emi-sub { font-size: 11px; color: #3b82f6; }
      .emi-circle {
        width: 44px;
        height: 44px;
        background: #ffffff;
        color: #2563eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        .material-icons { font-size: 24px; }
      }
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .dti-preview-bar {
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-top: 10px;
      .dti-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .bar-bg {
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        background: #10b981;
        transition: width 0.2s ease;
        &.bar-danger { background: #ef4444; }
      }
    }
    .upload-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 36px 20px;
      text-align: center;
      background: #f8fafc;
      .drop-icon { font-size: 48px; color: #3b82f6; margin-bottom: 12px; }
      h4 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    }
    .selected-file-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 14px;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 28px;
      border-top: 1px solid var(--border);
      padding-top: 20px;
    }
    .wizard-nav-btns {
      display: flex;
      gap: 10px;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  applications = signal<LoanApplication[]>([]);
  selectedApp = signal<LoanApplication | null>(null);
  documents = signal<LoanDocument[]>([]);
  clarifications = signal<Clarification[]>([]);
  products = signal<LoanProduct[]>([]);
  aiExplanation = signal<{ status: string; explanation: string; nextSteps: string } | null>(null);

  loadingApps = signal(false);
  actionLoading = signal(false);
  loadingAiExplain = signal(false);
  showApplyModal = signal(false);
  wizardStep = signal(1);

  clarificationResponse = '';
  selectedFile: File | null = null;

  // New Application Form State
  newApp = {
    loanProductId: 1,
    requestedAmount: 250000,
    requestedTenureMonths: 36,
    applicantName: '',
    applicantAge: 28,
    monthlyIncome: 65000,
    monthlyObligations: 12000,
    employmentType: 'SALARIED',
    employerName: 'Apex Financial Services',
  };

  // Computed metrics
  readonly pendingCount = computed(() =>
    this.applications().filter((a) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'OFFICER_RECOMMENDED'].includes(a.status),
    ).length,
  );

  readonly clarificationCount = computed(() =>
    this.applications().filter((a) => a.status === 'CLARIFICATION_REQUIRED').length,
  );

  readonly approvedCount = computed(() =>
    this.applications().filter((a) => a.status === 'MANAGER_APPROVED').length,
  );

  calculatedEmi(): number {
    const P = Number(this.newApp.requestedAmount || 0);
    const n = Number(this.newApp.requestedTenureMonths || 1);
    const annualRate = this.selectedProductRate();
    const r = annualRate / 12 / 100;

    if (r === 0 || n <= 0) return Math.round(P / (n || 1));
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return isNaN(emi) ? 0 : Math.round(emi);
  }

  projectedDti(): number {
    const totalObligations = Number(this.newApp.monthlyObligations || 0) + this.calculatedEmi();
    const income = Number(this.newApp.monthlyIncome || 1);
    if (income <= 0) return 0;
    const dti = Math.round((totalObligations / income) * 100);
    return isNaN(dti) ? 0 : dti;
  }

  selectedProduct(): LoanProduct | undefined {
    const id = Number(this.newApp.loanProductId);
    return this.products().find((p) => p.id === id) || this.products()[0];
  }

  selectedProductName(): string {
    return this.selectedProduct()?.name || 'Personal Loan';
  }

  selectProduct(p: LoanProduct): void {
    this.newApp.loanProductId = p.id;
    const minAmt = Number(p.minAmount);
    const maxAmt = Number(p.maxAmount);
    if (this.newApp.requestedAmount < minAmt) {
      this.newApp.requestedAmount = minAmt;
    } else if (this.newApp.requestedAmount > maxAmt) {
      this.newApp.requestedAmount = maxAmt;
    }

    if (this.newApp.requestedTenureMonths < p.minTenureMonths) {
      this.newApp.requestedTenureMonths = p.minTenureMonths;
    } else if (this.newApp.requestedTenureMonths > p.maxTenureMonths) {
      this.newApp.requestedTenureMonths = p.maxTenureMonths;
    }
  }

  selectedProductRate(): number {
    const prod = this.selectedProduct();
    return prod ? Number(prod.interestRate) : 12;
  }

  onAmountChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.newApp.requestedAmount = val;
  }

  onTenureChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.newApp.requestedTenureMonths = val;
  }

  onIncomeChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.newApp.monthlyIncome = val;
  }

  onObligationsChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.newApp.monthlyObligations = val;
  }

  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadApplications();
    this.route.queryParams.subscribe((params) => {
      const targetId = params['appId'] ? Number(params['appId']) : null;
      if (targetId && this.applications().length > 0) {
        const found = this.applications().find((a) => a.id === targetId);
        if (found && this.selectedApp()?.id !== targetId) {
          this.selectApplication(found);
        }
      }
    });
  }

  loadProducts(): void {
    this.api.getLoanProducts().subscribe({
      next: (prods) => this.products.set(prods),
      error: () => {},
    });
  }

  loadApplications(): void {
    this.loadingApps.set(true);
    this.api.getMyApplications().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loadingApps.set(false);
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
      error: () => this.loadingApps.set(false),
    });
  }

  selectApplication(app: LoanApplication): void {
    this.selectedApp.set(app);
    this.loadDocuments(app.id);
    this.loadClarifications(app.id);
    this.loadAiExplanation(app.id);
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

  loadAiExplanation(appId: number): void {
    this.loadingAiExplain.set(true);
    this.api.explainStatus(appId).subscribe({
      next: (exp) => {
        this.aiExplanation.set(exp);
        this.loadingAiExplain.set(false);
      },
      error: () => this.loadingAiExplain.set(false),
    });
  }

  openApplyModal(productId?: number): void {
    const targetProd = productId
      ? this.products().find((p) => p.id === productId)
      : this.products()[0];

    if (targetProd) {
      this.selectProduct(targetProd);
    } else {
      this.newApp.loanProductId = 1;
    }
    const user = this.auth.currentUser();
    this.newApp.applicantName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
      : 'Valued Customer';
    this.wizardStep.set(1);
    this.selectedFile = null;
    this.showApplyModal.set(true);
  }

  closeApplyModal(): void {
    this.showApplyModal.set(false);
  }

  onModalFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  async createAndSubmitApplication(saveDraftOnly: boolean): Promise<void> {
    this.actionLoading.set(true);
    try {
      const defaultProdId = this.products()[0]?.id ?? 1;
      const loanProductId = Number(this.newApp.loanProductId) || defaultProdId;

      const payload = {
        loanProductId: Number(loanProductId),
        requestedAmount: Number(this.newApp.requestedAmount || 250000),
        requestedTenureMonths: Number(this.newApp.requestedTenureMonths || 36),
        applicantName: this.newApp.applicantName || this.auth.currentUser()?.firstName || 'Valued Customer',
        applicantAge: Number(this.newApp.applicantAge || 28),
        monthlyIncome: Number(this.newApp.monthlyIncome || 65000),
        monthlyObligations: Number(this.newApp.monthlyObligations || 0),
        employmentType: this.newApp.employmentType || 'SALARIED',
        employerName: this.newApp.employerName || 'Apex Financial Services',
      };

      // 1. Create Application
      const app = await this.api.createApplication(payload).toPromise();
      if (!app) return;

      // 2. Upload Document if selected
      if (this.selectedFile) {
        await this.api.uploadDocument(app.id, 'SALARY_SLIP', this.selectedFile).toPromise();
      }

      // 3. Submit if not draft only
      if (!saveDraftOnly) {
        await this.api.submitApplication(app.id).toPromise();
      }

      this.closeApplyModal();
      this.loadApplications();
    } catch (err: any) {
      alert('Application error: ' + (err?.error?.message || err.message));
    } finally {
      this.actionLoading.set(false);
    }
  }

  async submitApplication(appId: number): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.api.submitApplication(appId).toPromise();
      this.loadApplications();
    } catch (err: any) {
      alert('Could not submit application: ' + (err?.error?.message || err.message));
    } finally {
      this.actionLoading.set(false);
    }
  }

  onFileSelected(event: Event, appId: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.actionLoading.set(true);
      this.api.uploadDocument(appId, 'SALARY_SLIP', file).subscribe({
        next: () => {
          this.loadDocuments(appId);
          this.actionLoading.set(false);
        },
        error: (err) => {
          alert('Upload failed: ' + (err?.error?.message || err.message));
          this.actionLoading.set(false);
        },
      });
    }
  }

  respondToClarification(clarificationId: number): void {
    if (!this.clarificationResponse) return;
    this.actionLoading.set(true);
    this.api
      .respondClarification(clarificationId, { response: this.clarificationResponse })
      .subscribe({
        next: () => {
          this.clarificationResponse = '';
          this.actionLoading.set(false);
          if (this.selectedApp()) {
            this.loadClarifications(this.selectedApp()!.id);
            this.loadApplications();
          }
        },
        error: (err) => {
          alert('Clarification error: ' + (err?.error?.message || err.message));
          this.actionLoading.set(false);
        },
      });
  }

  isStepCompleted(current: string, step: string): boolean {
    const order = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'CLARIFICATION_REQUIRED',
      'RESUBMITTED',
      'OFFICER_RECOMMENDED',
      'MANAGER_APPROVED',
      'MANAGER_REJECTED',
    ];
    return order.indexOf(current) > order.indexOf(step);
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatCurrency(val?: number | string): string {
    return Number(val || 0).toLocaleString('en-IN');
  }
}
