# LOS Backend - Local Development Environment Setup

This document explains how to set up the same local development environment used for the LOS Backend project.

## 1. Prerequisites

Install the following on Windows:

- Git
- Node.js (LTS)
- npm
- WSL2
- Ubuntu
- Docker Desktop

Make sure Docker Desktop has WSL2 integration enabled.

Open Ubuntu / WSL and verify:

```bash
docker --version
node --version
npm --version
```

---

## 2. Clone the Repository

Open Ubuntu / WSL.

Clone the project:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Enter the project:

```bash
cd <PROJECT_FOLDER>
```

Install dependencies:

```bash
npm install
```

---

## 3. PostgreSQL Setup

PostgreSQL runs inside Docker through WSL.

Run:

```bash
docker run --name los-postgres \
  -e POSTGRES_USER=los_user \
  -e POSTGRES_PASSWORD=los_password \
  -e POSTGRES_DB=los_db \
  -p 5433:5432 \
  -d postgres:16
```

Check:

```bash
docker ps
```

You should see:

```text
los-postgres
```

PostgreSQL configuration:

```text
Host: localhost
Port: 5433
Database: los_db
Username: los_user
Password: los_password
```

If the container already exists but is stopped:

```bash
docker start los-postgres
```

---

## 4. Keycloak Setup

Keycloak also runs inside Docker through WSL.

Run:

```bash
docker run --name los-keycloak \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

Check:

```bash
docker ps
```

You should see:

```text
los-keycloak
```

Keycloak will be available at:

```text
http://localhost:8080
```

Admin login:

```text
Username: admin
Password: admin
```

---

## 5. Create the LOS Realm

Open Keycloak in your browser:

```text
http://localhost:8080
```

Login using the admin credentials.

Create a new realm:

```text
Realm name: los
```

The realm name must be exactly:

```text
los
```

---

## 6. Create Realm Roles

Inside the `los` realm, create these realm roles:

```text
customer
loan_officer
manager
```

These roles are used for role-based access control in the backend.

---

## 7. Create the Backend Client

Create a Keycloak client:

```text
Client ID: los-backend
Client type: OpenID Connect
```

For the current development setup:

```text
Client authentication: ON
Direct access grants: ON
```

Save the client and keep the generated client secret for your local `.env`.

---

## 8. Create the Admin Client

Create another client:

```text
Client ID: los-admin
Client type: OpenID Connect
Client authentication: ON
```

Enable the service account for this client.

The backend uses this client to create users and assign roles through the Keycloak Admin API.

Keep the generated client secret for your local `.env`.

---

## 9. Configure Admin Client Permissions

For the `los-admin` client:

1. Open the client.
2. Go to **Service Account Roles**.
3. Assign the required `realm-management` roles.

Required roles:

```text
manage-users
view-realm
```

Do not give `realm-admin` unless specifically required.

---

## 10. Create Test Users

Create a test customer:

```text
Username: testcustomer
Email: testcustomer@example.com
Role: customer
```

Create a test loan officer:

```text
Username: testofficer
Role: loan_officer
```

Create a test manager:

```text
Username: testmanager
Role: manager
```

These accounts are for local development/testing only.

---

## 11. Create the `.env` File

Create a `.env` file in the project root.

Example:

```env
KEYCLOAK_ADMIN_CLIENT_ID=los-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=YOUR_LOCAL_SECRET

DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=los_user
DB_PASSWORD=los_password
DB_NAME=los_db
```

Replace:

```text
YOUR_LOCAL_SECRET
```

with the secret generated for your local `los-admin` client.

Do not commit `.env` to GitHub.

---

## 12. Start the NestJS Backend

Make sure PostgreSQL and Keycloak are running:

```bash
docker ps
```

You should see:

```text
los-postgres
los-keycloak
```

Then start NestJS:

```bash
npm run start:dev
```

The backend runs on:

```text
http://localhost:3000
```

---

## 13. Test the Backend

Open:

```text
http://localhost:3000/health
```

The health endpoint should return a successful response.

---

## 14. Local Environment Architecture

Each developer should have their own local environment:

```text
Windows
│
└── WSL / Ubuntu
    │
    ├── Docker
    │   │
    │   ├── PostgreSQL
    │   │   └── localhost:5433
    │   │
    │   └── Keycloak
    │       └── localhost:8080
    │
    └── LOS Backend
        └── NestJS
            └── localhost:3000
```

Nothing needs to connect to another developer's laptop.

---

## 15. Important Commands

Check running containers:

```bash
docker ps
```

Start PostgreSQL:

```bash
docker start los-postgres
```

Start Keycloak:

```bash
docker start los-keycloak
```

Stop PostgreSQL:

```bash
docker stop los-postgres
```

Stop Keycloak:

```bash
docker stop los-keycloak
```

---

## 16. Important Notes

### Docker

Run Docker commands from WSL / Ubuntu.

### PostgreSQL

The application connects to:

```text
localhost:5433
```

The Docker container internally uses PostgreSQL port `5432`, but it is exposed to the host on `5433`.

### Keycloak

Keycloak runs on:

```text
localhost:8080
```

The realm must be:

```text
los
```

### NestJS

The backend runs on:

```text
localhost:3000
```

### Secrets

Never commit the following to GitHub:

```text
.env
Keycloak client secrets
Passwords
API keys
```

Each developer should use their own local credentials.

### Test Data

Use synthetic/test data only during development.

---

## 17. Final Checklist

Before starting development, verify:

- [ ] WSL / Ubuntu is working
- [ ] Docker works inside WSL
- [ ] PostgreSQL container is running
- [ ] Keycloak container is running
- [ ] `los` realm exists
- [ ] `customer` role exists
- [ ] `loan_officer` role exists
- [ ] `manager` role exists
- [ ] `los-backend` client exists
- [ ] `los-admin` client exists
- [ ] `los-admin` service account has `manage-users` and `view-realm`
- [ ] `.env` is configured
- [ ] NestJS starts successfully
- [ ] `http://localhost:3000/health` works

Once all of these are complete, the local LOS development environment is ready.
