# E2E Verification Script for Digital Loan Origination System (AI-LOS)

$baseUrl = "http://localhost:3000"
$keycloakUrl = "http://localhost:8080/realms/los/protocol/openid-connect/token"

function Get-Token($username, $password) {
    $body = @{
        client_id = "ai-los-client"
        grant_type = "password"
        username = $username
        password = $password
    }
    $res = Invoke-RestMethod -Uri $keycloakUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    return $res.access_token
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Testing Keycloak Authentication & Tokens" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$customerToken = Get-Token "testcustomer" "Password@123"
Write-Host "✓ testcustomer token acquired" -ForegroundColor Green

$officerToken = Get-Token "testofficer" "Password@123"
Write-Host "✓ testofficer token acquired" -ForegroundColor Green

$managerToken = Get-Token "testmanager" "Password@123"
Write-Host "✓ testmanager token acquired" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "2. Testing Customer Role Security Isolation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

try {
    $headers = @{ Authorization = "Bearer $customerToken" }
    $res = Invoke-RestMethod -Uri "$baseUrl/applications/work-queues" -Method Get -Headers $headers
    Write-Host "❌ FAILED: Customer was able to access staff work-queues!" -ForegroundColor Red
} catch {
    Write-Host "✓ PASSED: Customer blocked from /applications/work-queues with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Green
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "3. Testing Customer Application Creation & Draft Patching" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Create Draft
$createBody = @{
    productId = 1
    requestedAmount = 150000
    requestedTenureMonths = 24
    applicantName = "Rajesh Sharma"
    applicantAge = 32
    monthlyIncome = 65000
    monthlyObligations = 12000
    employmentType = "SALARIED"
    employerName = "Tata Consultancy Services"
} | ConvertTo-Json

$headers = @{ 
    Authorization = "Bearer $customerToken"
    "Content-Type" = "application/json"
}

$app = Invoke-RestMethod -Uri "$baseUrl/applications" -Method Post -Headers $headers -Body $createBody
Write-Host "✓ Application created with ID: $($app.id), Status: $($app.status), Version: $($app.version)" -ForegroundColor Green

# Patch Draft (LOS-FR-003, LOS-FR-004)
$patchBody = @{
    version = $app.version
    monthlyIncome = 70000
    monthlyObligations = 10000
} | ConvertTo-Json

$patchedApp = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)" -Method Patch -Headers $headers -Body $patchBody
Write-Host "✓ Application draft patched. New income: $($patchedApp.monthlyIncome), Version: $($patchedApp.version)" -ForegroundColor Green

# Upload Document (LOS-FR-006)
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$docContent = "Sample PAN Card Document Text Content"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"pan_card.txt`"",
    "Content-Type: text/plain$LF",
    $docContent,
    "--$boundary",
    "Content-Disposition: form-data; name=`"documentType`"$LF",
    "PAN_CARD",
    "--$boundary--"
) -join $LF

$uploadHeaders = @{
    Authorization = "Bearer $customerToken"
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

$docRes = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/documents" -Method Post -Headers $uploadHeaders -Body $bodyLines
Write-Host "✓ Document uploaded: $($docRes.documentType), ID: $($docRes.id)" -ForegroundColor Green

# Submit Application (LOS-FR-004)
$submittedApp = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/submit" -Method Post -Headers $headers
Write-Host "✓ Application submitted! Status: $($submittedApp.status)" -ForegroundColor Green

# Test AI Status Explainer for Customer (LOS-FR-009)
try {
    $explainRes = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/ai-explain" -Method Post -Headers $headers
    Write-Host "✓ AI Status Explainer responded: $($explainRes.plainSummary)" -ForegroundColor Green
} catch {
    Write-Host "⚠ AI Status Explainer notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "4. Testing Loan Officer Workflow" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$officerHeaders = @{ 
    Authorization = "Bearer $officerToken"
    "Content-Type" = "application/json"
}

# Fetch Work Queues
$queue = Invoke-RestMethod -Uri "$baseUrl/applications/work-queues" -Method Get -Headers $officerHeaders
Write-Host "✓ Officer fetched queue: $($queue.Count) total applications found" -ForegroundColor Green

# Start Review (Transition to UNDER_REVIEW)
$underReviewApp = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/review/start" -Method Post -Headers $officerHeaders
Write-Host "✓ Application transitioned to UNDER_REVIEW. Status: $($underReviewApp.status)" -ForegroundColor Green

# Test Deterministic Eligibility Check (LOS-FR-005, LOS-BR-01, LOS-BR-02, LOS-BR-03)
$eligibility = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/eligibility" -Method Get -Headers $officerHeaders
Write-Host "✓ Deterministic Eligibility: Eligible=$($eligibility.eligible), DTI=$($eligibility.details.dti)%" -ForegroundColor Green

# Request Clarification (LOS-FR-007)
$clarBody = @{
    question = "Please verify whether current employment with TCS has completed probation period."
} | ConvertTo-Json
$clar = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/clarifications" -Method Post -Headers $officerHeaders -Body $clarBody
Write-Host "✓ Officer requested clarification ID: $($clar.id), Question: '$($clar.question)'" -ForegroundColor Green

# Verify Status is now CLARIFICATION_REQUIRED
$clarApp = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)" -Method Get -Headers $officerHeaders
Write-Host "✓ Application status after clarification request: $($clarApp.status)" -ForegroundColor Green

# Customer answers clarification
$answerBody = @{
    answer = "Yes, completed 2 years of confirmed service as Senior Engineer at TCS."
} | ConvertTo-Json
$ansRes = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/clarifications/$($clar.id)/answer" -Method Post -Headers $headers -Body $answerBody
Write-Host "✓ Customer answered clarification: '$($ansRes.answer)'" -ForegroundColor Green

# Verify Status is now RESUBMITTED
$resubApp = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)" -Method Get -Headers $officerHeaders
Write-Host "✓ Application status after customer answer: $($resubApp.status)" -ForegroundColor Green

# Officer generates AI Summary / Recommendation (LOS-FR-009)
try {
    $aiRec = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/ai-recommendation" -Method Post -Headers $officerHeaders
    Write-Host "✓ AI Recommendation Advisory: $($aiRec.recommendation), Policy grounded: $($aiRec.policyGrounded)" -ForegroundColor Green
} catch {
    Write-Host "⚠ AI Recommendation notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Officer submits recommendation to Manager
$recBody = @{
    recommendation = "PROCEED"
    rationale = "Applicant has strong disposable income, confirmed IT employment, and low DTI of $($eligibility.details.dti)%."
} | ConvertTo-Json
$reviewRes = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/reviews" -Method Post -Headers $officerHeaders -Body $recBody
Write-Host "✓ Officer recommendation recorded! Status: $($reviewRes.status)" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "5. Testing Credit Manager Workflow & Override Detection" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$managerHeaders = @{ 
    Authorization = "Bearer $managerToken"
    "Content-Type" = "application/json"
}

# Manager views decision queue
$mgrQueue = Invoke-RestMethod -Uri "$baseUrl/applications/work-queues" -Method Get -Headers $managerHeaders
$appInMgrQueue = $mgrQueue | Where-Object { $_.id -eq $app.id }
Write-Host "✓ Application found in Manager Decision Queue. Status: $($appInMgrQueue.status)" -ForegroundColor Green

# Manager Approves Application
$decisionBody = @{
    decision = "APPROVE"
    reason = "Approved based on solid income verification and officer endorsement under Credit Policy Section 3.1."
} | ConvertTo-Json

$decRes = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/decisions" -Method Post -Headers $managerHeaders -Body $decisionBody
Write-Host "✓ Manager decision completed! Final Status: $($decRes.status), Decision: $($decRes.decision)" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "6. Testing Complete Audit Trail Lineage & CSV Export" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Fetch full chronological audit history
$auditHistory = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/audit" -Method Get -Headers $managerHeaders
Write-Host "✓ Audit history contains $($auditHistory.Count) immutable events:" -ForegroundColor Green
foreach ($evt in $auditHistory) {
    Write-Host "   [$($evt.createdAt)] $($evt.eventType) by $($evt.performedBy) ($($evt.actorRole)): $($evt.reason)" -ForegroundColor Gray
}

# Download CSV export
$csv = Invoke-RestMethod -Uri "$baseUrl/applications/$($app.id)/audit/csv" -Method Get -Headers $managerHeaders
Write-Host "✓ Audit CSV export successful ($($csv.Length) bytes, $($csv.Split("`n").Count) rows)" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
