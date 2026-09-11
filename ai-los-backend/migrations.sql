ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "applicantName" character varying;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "applicantAge" integer;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "monthlyIncome" numeric(12,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "monthlyObligations" numeric(12,2);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "employmentType" character varying(50);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "employerName" character varying(100);
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;

CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    "applicationId" integer NOT NULL,
    "eventType" character varying(100) NOT NULL,
    "actorId" character varying(255) NOT NULL,
    "actorRole" character varying(50) NOT NULL,
    details jsonb,
    "beforeState" character varying(50),
    "afterState" character varying(50),
    "createdAt" timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username character varying(100) UNIQUE NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    "firstName" character varying(100),
    "lastName" character varying(100),
    role character varying(50) NOT NULL DEFAULT 'customer',
    "keycloakId" character varying(255) UNIQUE,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);

INSERT INTO users (username, email, "firstName", "lastName", role, "keycloakId")
VALUES 
  ('testcustomer', 'customer@los.local', 'Demo', 'Customer', 'customer', 'testcustomer-kc-id'),
  ('testofficer', 'officer@los.local', 'Demo', 'Officer', 'loan_officer', 'testofficer-kc-id'),
  ('testmanager', 'manager@los.local', 'Demo', 'Manager', 'manager', 'testmanager-kc-id')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username character varying(100) UNIQUE NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    "firstName" character varying(100),
    "lastName" character varying(100),
    phone character varying(20),
    "keycloakId" character varying(255) UNIQUE,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employeeId" character varying(50) UNIQUE NOT NULL,
    username character varying(100) UNIQUE NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    "fullName" character varying(100) NOT NULL,
    "branchCode" character varying(50) DEFAULT 'MAIN-BRANCH',
    department character varying(100) DEFAULT 'Retail Lending',
    "maxReviewAmount" numeric(12,2) DEFAULT 1000000.00,
    "keycloakId" character varying(255) UNIQUE,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employeeId" character varying(50) UNIQUE NOT NULL,
    username character varying(100) UNIQUE NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    "fullName" character varying(100) NOT NULL,
    "branchCode" character varying(50) DEFAULT 'HQ-DECISIONING',
    "approvalLimit" numeric(12,2) DEFAULT 5000000.00,
    "keycloakId" character varying(255) UNIQUE,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);

INSERT INTO customers (username, email, "firstName", "lastName", "keycloakId")
VALUES ('testcustomer', 'customer@los.local', 'Demo', 'Customer', 'testcustomer-kc-id')
ON CONFLICT (username) DO NOTHING;

INSERT INTO loan_officers ("employeeId", username, email, "fullName", "branchCode", department, "keycloakId")
VALUES ('EMP-OFF-001', 'testofficer', 'officer@los.local', 'Demo Loan Officer', 'MAIN-BRANCH', 'Retail Underwriting', 'testofficer-kc-id')
ON CONFLICT (username) DO NOTHING;

INSERT INTO managers ("employeeId", username, email, "fullName", "branchCode", "approvalLimit", "keycloakId")
VALUES ('EMP-MGR-001', 'testmanager', 'manager@los.local', 'Demo Credit Manager', 'HQ-DECISIONING', 5000000.00, 'testmanager-kc-id')
ON CONFLICT (username) DO NOTHING;

INSERT INTO loan_products (code, name, description, "minAmount", "maxAmount", "interestRate", "minTenureMonths", "maxTenureMonths", max_maturity_age, "isActive")
VALUES 
  ('PL_STANDARD', 'Standard Personal Loan', 'General purpose personal loan for salaried borrowers', 50000.00, 1500000.00, 10.50, 12, 60, 65, true),
  ('PL_EXPRESS', 'Express Digital Cash', 'Instant pre-approved quick financing for urgent requirements', 25000.00, 500000.00, 12.00, 6, 36, 60, true),
  ('PL_PREMIUM', 'Executive Tier Loan', 'High-value low-interest credit for senior professionals', 500000.00, 4000000.00, 9.25, 12, 84, 65, true)
ON CONFLICT (code) DO NOTHING;

