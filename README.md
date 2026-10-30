# Finora by PayTrace

**Finora by PayTrace** is an automated personal expense tracking web application. It monitors HDFC Bank transaction emails received in your Gmail inbox, extracts transaction details using a structured regex rule engine, categorizes expenses, enforces duplicate detection, stores financial records in MongoDB, and presents real-time cashflow metrics on an Apple Liquid Glass + Groww inspired dashboard.

---

## Architecture & Workflow

```
HDFC Bank Transaction Email
            │
            ▼
    Gmail (Inbox)
            │
            ▼
   Gmail API (OAuth 2.0)
            │
            ▼
   Spring Boot Backend
            │
            ▼
    HDFC Email Parser
   (Regex Rule Engine)
            │
            ▼
    Smart Categorizer
(Food, Shopping, Travel...)
            │
            ▼
   Duplicate Detection
  (Bank, Account, RefNo)
            │
            ▼
  MongoDB (Decimal128)
            │
            ▼
Next.js Liquid Dashboard
(Metrics, Calendar, Charts)
```

---

## Key Features

1. **Automated HDFC Email Extraction**:
   - Parses **UPI Debits** (Swiggy, Zomato, etc.)
   - Parses **Credit Card Spends** (Amazon, Flipkart, etc.)
   - Parses **Account & Debit Card Spends**
   - Parses **Salary & Inflow Credits** (Infosys, Corporate Payroll)
   - Parses **Merchant Refunds**
   - Flags unrecognised or promotional emails as `NEEDS_REVIEW` without creating false records.

2. **Duplicate Prevention**:
   - Unique compound index on `(bank, accountNumber, referenceNumber)`.
   - Sparse unique index on `gmailMessageId`.
   - Audit tracking in the `emailProcessing` MongoDB collection.

3. **Smart Rule-Based Categorization**:
   - Automatically tags transactions into `Food & Dining`, `Shopping`, `Groceries`, `Travel & Fuel`, `Utilities & Bills`, `Entertainment`, `Health & Medical`, `Investment`, `Salary & Income`, `Refund`, or `Other`.

4. **Apple Liquid Glass + Groww Design**:
   - Obsidian dark theme with emerald green income and coral rose expenses.
   - Frosted translucent navigation dock (responsive for mobile and laptop).
   - Zero emojis — strictly professional SVG iconography using Lucide React.
   - Smooth micro-interactions and glowing status badges.

5. **Monthly Calendar View**:
   - Interactive day-by-day cashflow grid.
   - Daily income and expense pill indicators.
   - Click on any day to open a liquid slide-down drawer showing all transactions on that specific date.

6. **Automated & Manual Sync**:
   - Automated sync every 2 minutes (configurable down to 1 minute via `paytrace.gmail.sync.delay-ms`).
   - "Sync Now" button on the header and settings page.
   - Instant Email Ingestion Simulator for live testing without external cloud credentials.

---

## Project Structure

```
PayTrace/
├── backend/                       # Spring Boot 3 Java Backend
│   ├── src/main/java/com/paytrace/
│   │   ├── config/                # MongoConfig, SecurityConfig, SchedulerConfig
│   │   ├── controller/            # TransactionController, DashboardController, GmailSyncController
│   │   ├── dto/                   # Request & Response DTOs
│   │   ├── exception/             # GlobalExceptionHandler, Custom Exceptions
│   │   ├── model/                 # Transaction, EmailProcessing, GoogleCredential
│   │   ├── parser/                # HdfcEmailParser, CategoryClassifier, ParsedTransaction
│   │   ├── repository/            # Spring Data MongoDB Repositories
│   │   └── service/               # TransactionService, DashboardService, GmailApiService, EmailSyncScheduler
│   └── src/test/java/com/paytrace/
│       ├── parser/                # HdfcEmailParserTest (6 test cases)
│       └── service/               # DuplicateDetectionTest (3 test cases)
│
├── frontend/                      # Next.js 16 App Router UI
│   ├── src/app/
│   │   ├── page.tsx               # Dashboard (Overview, Monthly Chart, Calendar, Recent Txns)
│   │   ├── transactions/page.tsx  # Transactions Table, Search, Filters, Modal CRUD
│   │   ├── settings/page.tsx      # Gmail Connection, Ingestion Simulator, Setup Guide
│   │   └── globals.css            # Apple Liquid Glass design tokens & styles
│   └── src/components/
│       ├── layout/                # Header, NavigationDock
│       ├── dashboard/             # MetricCard, ExpenseChart, MonthlyCalendarView, RecentTransactions
│       └── transactions/          # TransactionTable, TransactionModal
│
├── .env.example                   # Sample environment variable template
└── README.md
```

---

## How to Set Up Google Cloud OAuth 2.0 Credentials

To enable real-time reading from your personal Gmail account:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com).
   - Click **Create Project** and name it `Finora PayTrace`.

2. **Enable Gmail API**:
   - In **APIs & Services > Library**, search for `Gmail API`.
   - Click **Enable**.

3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External** user type and fill in app name and support email.
   - Under **Scopes**, add: `https://www.googleapis.com/auth/gmail.readonly`.
   - Under **Test Users**, add your personal Gmail address.

4. **Create OAuth Client ID**:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs:
     ```
     http://localhost:8080/api/gmail/callback
     ```
   - Click **Create** and copy your **Client ID** and **Client Secret**.

5. **Provide the Credentials**:
   - Set in your environment or backend `application.yml`:
     ```bash
     export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
     export GOOGLE_CLIENT_SECRET="your-client-secret"
     ```

*(Note: Even before setting Google Cloud credentials, the application includes a built-in **HDFC Email Ingestion Simulator** on the Settings page to test extraction, duplicate prevention, and categorization immediately.)*

---

## Running the Application Locally

### 1. Prerequisites
- MongoDB running on `localhost:27017` (or MongoDB Atlas URI)
- Java 17+ / Maven 3.9+
- Node.js 18+ / npm

### 2. Start the Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`.

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## Running Automated Tests

To run the unit test suites (HDFC email parser patterns and duplicate detection):

```bash
cd backend
mvn clean test
```
All 9 unit tests validate:
- UPI debit parsing & category assignment
- Credit card spend parsing
- NetBanking & debit card spend parsing
- Salary & income credit parsing
- Refund transaction extraction
- Unrecognised promotional email handling (flags for review)
- Duplicate detection by reference number and Gmail message ID

---

## API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Monthly expenses, income, net savings, recent txns |
| `GET` | `/api/dashboard/monthly` | Past 6-months inflow vs outflow chart points |
| `GET` | `/api/dashboard/calendar?year=YYYY&month=MM` | Day-by-day cashflow for Monthly Calendar View |
| `GET` | `/api/transactions` | Search, filter by type/category/date, pagination |
| `POST` | `/api/transactions` | Manual transaction creation |
| `PUT` | `/api/transactions/{id}` | Update existing transaction |
| `DELETE` | `/api/transactions/{id}` | Remove transaction |
| `GET` | `/api/gmail/status` | Connection health, last sync, scanned email counts |
| `GET` | `/api/gmail/connect` | Google OAuth2 authorization URL |
| `GET` | `/api/gmail/callback` | OAuth redirect and token exchange |
| `POST` | `/api/gmail/sync` | Manual on-demand synchronisation trigger |
| `POST` | `/api/gmail/simulate-sync` | Immediate HDFC email ingestion test endpoint |
| `POST` | `/api/gmail/disconnect` | Disconnect Gmail account |
