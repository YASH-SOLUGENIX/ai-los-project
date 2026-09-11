import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AiRecommendationResult,
  AiSummary,
  AuditEvent,
  Clarification,
  EligibilityResult,
  LoanApplication,
  LoanDecision,
  LoanDocument,
  LoanProduct,
  LoanReview,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  // Loan Products
  getLoanProducts(): Observable<LoanProduct[]> {
    return this.http.get<LoanProduct[]>(`${this.baseUrl}/loan-products`);
  }

  // Applications
  getMyApplications(): Observable<LoanApplication[]> {
    return this.http.get<LoanApplication[]>(`${this.baseUrl}/applications/my`);
  }

  getApplication(id: number): Observable<LoanApplication> {
    return this.http.get<LoanApplication>(`${this.baseUrl}/applications/${id}`);
  }

  createApplication(dto: {
    loanProductId: number;
    requestedAmount: number;
    requestedTenureMonths: number;
    applicantName?: string;
    applicantAge?: number;
    monthlyIncome?: number;
    monthlyObligations?: number;
    employmentType?: string;
    employerName?: string;
  }): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(`${this.baseUrl}/applications`, dto);
  }

  updateDraft(
    id: number,
    dto: {
      loanProductId?: number;
      requestedAmount?: number;
      requestedTenureMonths?: number;
      applicantName?: string;
      applicantAge?: number;
      monthlyIncome?: number;
      monthlyObligations?: number;
      employmentType?: string;
      employerName?: string;
      version?: number;
    },
  ): Observable<LoanApplication> {
    return this.http.patch<LoanApplication>(`${this.baseUrl}/applications/${id}`, dto);
  }

  submitApplication(id: number): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(
      `${this.baseUrl}/applications/${id}/submit`,
      {},
    );
  }

  // Staff Work Queue
  getWorkQueues(filters?: {
    status?: string;
    search?: string;
  }): Observable<LoanApplication[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<LoanApplication[]>(
      `${this.baseUrl}/applications/work-queues`,
      { params },
    );
  }

  startReview(id: number): Observable<LoanApplication> {
    return this.http.post<LoanApplication>(
      `${this.baseUrl}/applications/${id}/review-start`,
      {},
    );
  }

  // Documents
  getDocuments(applicationId: number): Observable<LoanDocument[]> {
    return this.http.get<LoanDocument[]>(
      `${this.baseUrl}/applications/${applicationId}/documents`,
    );
  }

  uploadDocument(
    applicationId: number,
    documentType: string,
    file: File,
  ): Observable<LoanDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return this.http.post<LoanDocument>(
      `${this.baseUrl}/applications/${applicationId}/documents`,
      formData,
    );
  }

  deleteDocument(applicationId: number, documentId: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/applications/${applicationId}/documents/${documentId}`,
    );
  }

  // Reviews
  createReview(
    applicationId: number,
    dto: { recommendation: string; rationale: string },
  ): Observable<{ message: string; review: LoanReview; applicationStatus: string }> {
    return this.http.post<{
      message: string;
      review: LoanReview;
      applicationStatus: string;
    }>(`${this.baseUrl}/applications/${applicationId}/review`, dto);
  }

  // Decisions
  makeDecision(
    applicationId: number,
    dto: { decision: string; reason: string },
  ): Observable<{ message: string; decision: LoanDecision; applicationStatus: string }> {
    return this.http.post<{
      message: string;
      decision: LoanDecision;
      applicationStatus: string;
    }>(`${this.baseUrl}/applications/${applicationId}/decision`, dto);
  }

  // Clarifications
  getClarifications(applicationId: number): Observable<Clarification[]> {
    return this.http.get<Clarification[]>(
      `${this.baseUrl}/applications/${applicationId}/clarifications`,
    );
  }

  createClarification(
    applicationId: number,
    dto: { question: string },
  ): Observable<Clarification> {
    return this.http.post<Clarification>(
      `${this.baseUrl}/applications/${applicationId}/clarifications`,
      dto,
    );
  }

  respondClarification(
    clarificationId: number,
    dto: { response: string },
  ): Observable<Clarification> {
    return this.http.post<Clarification>(
      `${this.baseUrl}/applications/clarifications/${clarificationId}/respond`,
      dto,
    );
  }

  // Deterministic Eligibility
  checkEligibility(
    applicationId: number,
    dto?: { age?: number; monthlyIncome?: number; monthlyObligations?: number },
  ): Observable<EligibilityResult> {
    return this.http.post<EligibilityResult>(
      `${this.baseUrl}/applications/${applicationId}/eligibility`,
      dto || {},
    );
  }

  // AI Endpoints
  generateAiSummary(applicationId: number): Observable<AiSummary> {
    return this.http.post<AiSummary>(
      `${this.baseUrl}/applications/${applicationId}/ai-summary`,
      {},
    );
  }

  generateAiRecommendation(
    applicationId: number,
    dto?: { age?: number; monthlyIncome?: number; monthlyObligations?: number },
  ): Observable<AiRecommendationResult> {
    return this.http.post<AiRecommendationResult>(
      `${this.baseUrl}/applications/${applicationId}/ai-recommendation`,
      dto || {},
    );
  }

  explainStatus(
    applicationId: number,
  ): Observable<{ status: string; explanation: string; nextSteps: string }> {
    return this.http.post<{
      status: string;
      explanation: string;
      nextSteps: string;
    }>(`${this.baseUrl}/applications/${applicationId}/ai-explain`, {});
  }

  draftClarification(
    applicationId: number,
  ): Observable<{ suggestedQuestions: string[] }> {
    return this.http.post<{ suggestedQuestions: string[] }>(
      `${this.baseUrl}/applications/${applicationId}/ai-clarify-draft`,
      {},
    );
  }

  // Audit Events & CSV
  getAuditHistory(applicationId: number): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(
      `${this.baseUrl}/applications/${applicationId}/audit`,
    );
  }

  downloadAuditCsv(applicationId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/applications/${applicationId}/audit/csv`,
      { responseType: 'blob' },
    );
  }

  // Admin & Staff Governance
  getAllStaff(): Observable<{ loanOfficers: any[]; managers: any[] }> {
    return this.http.get<{ loanOfficers: any[]; managers: any[] }>(
      `${this.baseUrl}/admin/staff`,
    );
  }

  provisionStaff(dto: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    role: 'loan_officer' | 'manager';
    employeeId: string;
    branchCode?: string;
    department?: string;
    approvalLimit?: number;
    maxReviewAmount?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/staff`, dto);
  }

  syncKeycloakUsers(): Observable<{ message: string; count: number; synced: any[] }> {
    return this.http.post<{ message: string; count: number; synced: any[] }>(
      `${this.baseUrl}/admin/sync-keycloak`,
      {},
    );
  }

  getAllCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/customers`);
  }
}
