export type UserRole = 'customer' | 'loan_officer' | 'manager' | 'auditor' | 'admin';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  token: string;
  firstName?: string;
  lastName?: string;
}

export interface LoanProduct {
  id: number;
  code: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  maxMaturityAge: number;
  isActive: boolean;
}

export interface LoanDocument {
  id: number;
  applicationId: number;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface LoanApplication {
  id: number;
  customerId: string;
  loanProductId: number;
  requestedAmount: number;
  requestedTenureMonths: number;
  status: string;
  applicantName?: string;
  applicantAge?: number;
  monthlyIncome?: number;
  monthlyObligations?: number;
  employmentType?: string;
  employerName?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Clarification {
  id: number;
  applicationId: number;
  officerId: string;
  question: string;
  customerResponse?: string;
  status: 'OPEN' | 'RESPONDED';
  createdAt: string;
}

export interface LoanReview {
  id: number;
  applicationId: number;
  officerId: string;
  recommendation: 'PROCEED' | 'REVIEW' | 'DECLINE';
  rationale: string;
  createdAt: string;
}

export interface LoanDecision {
  id: number;
  applicationId: number;
  managerId: string;
  decision: 'APPROVE' | 'REJECT' | 'RETURN';
  reason: string;
  decidedAt: string;
}

export interface AuditEvent {
  id: number;
  applicationId: number;
  eventType: string;
  actorId: string;
  actorRole: string;
  details?: Record<string, any>;
  beforeState?: string;
  afterState?: string;
  createdAt: string;
}

export interface AiSummary {
  facts: string[];
  missing: string[];
  inconsistencies: string[];
  risks: string[];
  sourceReferences: string[];
  summary: string;
}

export interface PolicyCitation {
  policyChunkId: string;
  quote: string;
}

export interface RiskFlag {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AiRecommendationResult {
  recommendation: 'PROCEED' | 'REVIEW' | 'DECLINE';
  riskFlags: RiskFlag[];
  reasons: string[];
  citations: PolicyCitation[];
  disclaimer: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasonCodes: string[];
  details: {
    age: number;
    maturityAge: number;
    maxMaturityAge: number;
    requestedAmount: number;
    requestedTenureMonths: number;
    estimatedEmi: number;
    monthlyIncome: number;
    monthlyObligations: number;
    dti: number;
    maxDti: number;
  };
}
