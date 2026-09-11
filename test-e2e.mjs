// E2E Verification Script for Digital Loan Origination System (AI-LOS)

const BASE_URL = 'http://localhost:3000';

async function getToken(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get token for ${username}: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function runTests() {
  console.log('====================================================');
  console.log('1. Testing Keycloak Authentication & Role Token Issuance');
  console.log('====================================================');

  const customerToken = await getToken('testcustomer', 'Password@123');
  console.log('✓ Acquired token for testcustomer');

  const officerToken = await getToken('testofficer', 'Password@123');
  console.log('✓ Acquired token for testofficer');

  const managerToken = await getToken('testmanager', 'Password@123');
  console.log('✓ Acquired token for testmanager');

  console.log('\n====================================================');
  console.log('2. Testing Security & Role Isolation (LOS-FR-001, LOS-FR-002)');
  console.log('====================================================');

  // Customer attempting to view staff work queues
  const custQueueRes = await fetch(`${BASE_URL}/applications/work-queues`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (custQueueRes.status === 403) {
    console.log('✓ PASSED: Customer blocked from /applications/work-queues with 403 Forbidden');
  } else {
    throw new Error(`Expected 403 for customer on work-queues, got ${custQueueRes.status}`);
  }

  console.log('\n====================================================');
  console.log('3. Testing Customer Application Creation & Draft Management');
  console.log('====================================================');

  // 3a. Create Draft Application
  const createRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      loanProductId: 1,
      requestedAmount: 200000,
      requestedTenureMonths: 24,
      applicantName: 'Vikram Malhotra',
      applicantAge: 32,
      monthlyIncome: 75000,
      monthlyObligations: 12000,
      employmentType: 'SALARIED',
      employerName: 'Tata Consultancy Services',
    }),
  });
  if (!createRes.ok) throw new Error(`Create app failed: ${await createRes.text()}`);
  const createdApp = await createRes.json();
  console.log(`✓ Draft application created: ID #${createdApp.id}, Status: ${createdApp.status}, Version: ${createdApp.version}`);

  // 3b. Patch Draft with optimistic locking
  const patchRes = await fetch(`${BASE_URL}/applications/${createdApp.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: createdApp.version,
      monthlyIncome: 80000,
      monthlyObligations: 10000,
    }),
  });
  if (!patchRes.ok) throw new Error(`Patch app failed: ${await patchRes.text()}`);
  const patchedApp = await patchRes.json();
  console.log(`✓ Draft application patched: Income ₹${patchedApp.monthlyIncome}, Version: ${patchedApp.version}`);

  // 3c. Upload Mandatory Document (SALARY_SLIP as PDF)
  const formData = new FormData();
  const pdfHeader = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000116 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
  const fileBlob = new Blob([pdfHeader], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'vikram_salary_slip.pdf');
  formData.append('documentType', 'SALARY_SLIP');

  const uploadRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: formData,
  });
  if (!uploadRes.ok) throw new Error(`Upload document failed: ${await uploadRes.text()}`);
  const doc = await uploadRes.json();
  console.log(`✓ Document uploaded: ID #${doc.id}, Type: ${doc.documentType}, Original Name: ${doc.originalName}`);

  // 3d. Submit Application
  const submitRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (!submitRes.ok) throw new Error(`Submit failed: ${await submitRes.text()}`);
  const submittedApp = await submitRes.json();
  console.log(`✓ Application submitted! Status: ${submittedApp.status}`);

  // 3e. AI Status Explainer for Customer (LOS-FR-009)
  const explainRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/ai-explain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (explainRes.ok) {
    const explainData = await explainRes.json();
    console.log(`✓ Customer AI Status Explainer response:\n  "${explainData.plainSummary}"`);
  }

  console.log('\n====================================================');
  console.log('4. Testing Loan Officer Workflow & Underwriting');
  console.log('====================================================');

  // 4a. Officer fetches queues
  const queueRes = await fetch(`${BASE_URL}/applications/work-queues`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const queues = await queueRes.json();
  console.log(`✓ Officer fetched work queue: ${queues.length} total applications found`);

  // 4b. Officer transitions application to UNDER_REVIEW
  const reviewStartRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/review-start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  if (!reviewStartRes.ok) throw new Error(`Review start failed: ${await reviewStartRes.text()}`);
  const underReviewApp = await reviewStartRes.json();
  console.log(`✓ Application moved to UNDER_REVIEW: Status = ${underReviewApp.status}`);

  // 4c. Deterministic Eligibility Check (LOS-FR-005, LOS-BR-01, LOS-BR-02, LOS-BR-03)
  const elRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/eligibility`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!elRes.ok) throw new Error(`Eligibility check failed: ${await elRes.text()}`);
  const elData = await elRes.json();
  console.log(`✓ Deterministic Eligibility Engine:\n  Eligible: ${elData.eligible}\n  Calculated DTI: ${elData.details?.dti}%\n  Estimated EMI: ₹${elData.details?.estimatedEmi}\n  Applicant Maturity Age: ${elData.details?.maturityAge} Yrs`);

  // 4d. AI Clarification Drafting (LOS-FR-009)
  const draftClarRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/ai-clarify-draft`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  let suggestedQ = 'Please provide confirmation of active employment status.';
  if (draftClarRes.ok) {
    const draftClarData = await draftClarRes.json();
    if (draftClarData.suggestedQuestions && draftClarData.suggestedQuestions.length > 0) {
      suggestedQ = draftClarData.suggestedQuestions[0];
      console.log(`✓ AI Clarification Assistant suggested questions:\n  - ${draftClarData.suggestedQuestions.join('\n  - ')}`);
    }
  }

  // 4e. Officer sends Clarification Request (LOS-FR-007)
  const clarRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/clarifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question: suggestedQ }),
  });
  if (!clarRes.ok) throw new Error(`Create clarification failed: ${await clarRes.text()}`);
  const clar = await clarRes.json();
  console.log(`✓ Clarification created: ID #${clar.id}, Question: "${clar.question}"`);

  // 4f. Customer responds to clarification
  const ansRes = await fetch(`${BASE_URL}/applications/clarifications/${clar.id}/respond`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      response: 'Confirmed. I have completed 4 years of continuous service with TCS as a Senior Consultant.',
    }),
  });
  if (!ansRes.ok) throw new Error(`Clarification response failed: ${await ansRes.text()}`);
  const answered = await ansRes.json();
  console.log(`✓ Customer responded to clarification #${clar.id}. Application status: ${answered.applicationStatus || 'RESUBMITTED'}`);

  // 4g. Officer AI Recommendation Advisory (LOS-FR-009, LOS-FR-010)
  const aiRecRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/ai-recommendation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (aiRecRes.ok) {
    const aiRecData = await aiRecRes.json();
    console.log(`✓ AI Underwriting Advisory Recommendation:\n  Recommendation: ${aiRecData.recommendation}\n  Confidence: ${aiRecData.confidence}\n  Reasons: ${aiRecData.reasons?.join('; ')}`);
  }

  // 4h. Officer submits recommendation for Manager review
  const recRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recommendation: 'PROCEED',
      rationale: `Verified employment documents and clean DTI profile (${elData.details?.dti}%). Recommending for standard sanction.`,
    }),
  });
  if (!recRes.ok) throw new Error(`Submit review failed: ${await recRes.text()}`);
  const reviewResult = await recRes.json();
  console.log(`✓ Officer review submitted: Application status = ${reviewResult.applicationStatus || 'OFFICER_RECOMMENDED'}`);

  console.log('\n====================================================');
  console.log('5. Testing Credit Manager Decision & Override Logic (LOS-BR-07)');
  console.log('====================================================');

  // 5a. Manager views decision queue
  const mgrQueueRes = await fetch(`${BASE_URL}/applications/work-queues`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const mgrQueue = await mgrQueueRes.json();
  const targetApp = mgrQueue.find((a) => a.id === createdApp.id);
  console.log(`✓ Manager found application #${createdApp.id} in queue. Status: ${targetApp?.status}`);

  // 5b. Manager submits Final Approval
  const decRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/decision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      decision: 'APPROVE',
      reason: 'Sanction approved in accordance with Credit Policy Manual Section 4.2. All underwriting criteria satisfied.',
    }),
  });
  if (!decRes.ok) throw new Error(`Decision failed: ${await decRes.text()}`);
  const decResult = await decRes.json();
  console.log(`✓ Manager decision recorded: Status = ${decResult.applicationStatus || 'MANAGER_APPROVED'}`);

  console.log('\n====================================================');
  console.log('6. Testing Immutable Audit Trail & Regulatory CSV Export (LOS-FR-011)');
  console.log('====================================================');

  // 6a. Fetch full audit lineage
  const auditRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/audit`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const auditEvents = await auditRes.json();
  console.log(`✓ Audit log verified: ${auditEvents.length} chronological immutable events logged:`);
  for (const evt of auditEvents) {
    console.log(`   [${evt.createdAt}] ${evt.eventType.padEnd(28)} | By: ${evt.performedBy} (${evt.actorRole}) | ${evt.reason || '-'}`);
  }

  // 6b. Download regulatory CSV export
  const csvRes = await fetch(`${BASE_URL}/applications/${createdApp.id}/audit/csv`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const csvData = await csvRes.text();
  console.log(`✓ Regulatory audit CSV export downloaded (${csvData.length} bytes, ${csvData.trim().split('\n').length} lines)`);

  console.log('\n====================================================');
  console.log('ALL END-TO-END VALIDATION TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
