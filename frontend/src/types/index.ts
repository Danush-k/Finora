export type TransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER";

export type PaymentMethod = "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NET_BANKING" | "MANUAL";

export type TransactionSource = "GMAIL_AUTOMATED" | "MANUAL";

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
