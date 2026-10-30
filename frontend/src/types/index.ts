export type TransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER";

export type PaymentMethod = "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING" | "MANUAL";

export type TransactionSource = "GMAIL_AUTOMATED" | "MANUAL" | "CSV_IMPORT";

export interface Transaction {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  transactionType: TransactionType;
  merchant: string;
  description?: string;
  transactionDate: string;
  referenceNumber?: string;
  category: string;
  paymentMethod: PaymentMethod;
  source: TransactionSource;
  gmailMessageId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionRequest {
  bank?: string;
  accountNumber?: string;
  amount: number;
  transactionType: TransactionType;
  merchant: string;
  description?: string;
  transactionDate: string;
  referenceNumber?: string;
  category?: string;
  paymentMethod: PaymentMethod;
}

export interface DashboardSummary {
  totalExpensesThisMonth: number;
  totalIncomeThisMonth: number;
  netSavingsThisMonth: number;
  totalTransactionsCount: number;
  expensesCountThisMonth: number;
  incomeCountThisMonth: number;
  recentTransactions: Transaction[];
  categoryBreakdown: Record<string, number>;
  activeMonthName?: string;
  activeMonthKey?: string;
}

export interface MonthlyChartPoint {
  month: string;
  fullMonth: string;
  year?: number;
  monthNumber?: number;
  expenses: number;
  income: number;
  savings: number;
}

export interface MonthlyChartData {
  points: MonthlyChartPoint[];
}

export interface CalendarDaySummary {
  date: string;
  dayOfMonth: number;
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  transactions: Transaction[];
}

export interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
  totalEmailsProcessed: number;
  totalTransactionsExtracted: number;
  needsReviewCount: number;
  duplicateCount: number;
  senderFilter: string;
  syncIntervalSeconds: number;
  isSyncing: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CsvTransaction {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  transactionType: TransactionType;
  merchant: string;
  description: string;
  transactionDate: string;
  formattedDate: string;
  referenceNumber?: string;
  category: string;
  paymentMethod: PaymentMethod;
}

export interface CsvVerificationResult {
  totalRows: number;
  existingCount: number;
  newCount: number;
  newTransactions: CsvTransaction[];
  existingTransactions: CsvTransaction[];
  message: string;
  allPresent: boolean;
}

export type DebtLentType = "LENT" | "DEBT";
export type DebtLentStatus = "ACTIVE" | "PARTIALLY_SETTLED" | "SETTLED" | "OVERDUE";
export type InterestPeriodType = "MONTHLY" | "YEARLY" | "CUSTOM";

export interface RepaymentInstallment {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  settled: boolean;
  settledDate?: string;
  settledAmount?: number;
  linkedTransactionId?: string;
  linkedTransactionDescription?: string;
  notes?: string;
}

export interface DebtLentRecord {
  id: string;
  type: DebtLentType;
  counterpartyName: string;
  counterpartyPhone?: string;
  principalAmount: number;
  description?: string;
  startDate: string;
  dueDate?: string;
  linkedTransactionId?: string;
  linkedTransactionDescription?: string;
  linkedTransactionAmount?: number;
  hasInterest: boolean;
  interestRate?: number;
  interestPeriodType: InterestPeriodType;
  tenureMonths?: number;
  accruedInterest?: number;
  totalExpectedAmount: number;
  installments: RepaymentInstallment[];
  totalRepaidAmount: number;
  remainingAmount: number;
  status: DebtLentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DebtLentSummary {
  totalLentPrincipal: number;
  totalLentRemaining: number;
  totalLentRecovered: number;
  lentActiveCount: number;
  totalDebtPrincipal: number;
  totalDebtRemaining: number;
  totalDebtRepaid: number;
  debtActiveCount: number;
  netStanding: number;
  overdueCount: number;
}

export interface DebtLentRequest {
  type: DebtLentType;
  counterpartyName: string;
  counterpartyPhone?: string;
  principalAmount: number;
  description?: string;
  startDate: string;
  dueDate?: string;
  linkedTransactionId?: string;
  linkedTransactionDescription?: string;
  linkedTransactionAmount?: number;
  hasInterest: boolean;
  interestRate?: number;
  interestPeriodType?: InterestPeriodType;
  tenureMonths?: number;
  installments?: RepaymentInstallment[];
}
