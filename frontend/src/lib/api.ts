import {
  ApiResponse,
  CalendarDaySummary,
  DashboardSummary,
  GmailStatus,
  MonthlyChartData,
  PageResponse,
  Transaction,
  TransactionRequest,
  CsvTransaction,
  CsvVerificationResult,
  DebtLentRecord,
  DebtLentRequest,
  DebtLentStatus,
  DebtLentSummary,
  DebtLentType,
  MerchantRule,
  CategoryBudgetStatus,
  OverallBudgetInfo,
  BudgetSummaryResponse,
} from "@/types";


const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errMsg = `Request failed: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.message || errMsg;
      } catch {
        // ignore parse error
      }
      throw new Error(errMsg);
    }

    const json: ApiResponse<T> = await res.json();
    return json.data;
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard
  getDashboardSummary: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (month) params.append("month", month.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<DashboardSummary>(`/dashboard/summary${query}`);
  },
  getMonthlyChart: () => request<MonthlyChartData>("/dashboard/monthly"),
  getMonthlyCalendar: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (month) params.append("month", month.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<CalendarDaySummary[]>(`/dashboard/calendar${query}`);
  },

  // Transactions
  getTransactions: (params?: {
    type?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.type && params.type !== "ALL") q.append("type", params.type);
    if (params?.category && params.category !== "ALL") q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    if (params?.startDate) q.append("startDate", params.startDate);
    if (params?.endDate) q.append("endDate", params.endDate);
    if (params?.page !== undefined) q.append("page", params.page.toString());
    if (params?.size !== undefined) q.append("size", params.size.toString());
    return request<PageResponse<Transaction>>(`/transactions?${q.toString()}`);
  },
  getTransactionById: (id: string) => request<Transaction>(`/transactions/${id}`),
  createTransaction: (data: TransactionRequest) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTransaction: (id: string, data: TransactionRequest) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, {
      method: "DELETE",
    }),

  // CSV Import
  verifyCsv: async (file: File): Promise<CsvVerificationResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${getBaseUrl()}/transactions/csv/verify`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `CSV verification failed: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const json: ApiResponse<CsvVerificationResult> = await res.json();
    return json.data;
  },

  confirmCsvImport: (transactions: CsvTransaction[]) =>
    request<number>("/transactions/csv/confirm", {
      method: "POST",
      body: JSON.stringify({ transactions }),
    }),

  getCsvTemplateUrl: () => `${getBaseUrl()}/transactions/csv/template`,

  // Debt & Lent (Receivables & Payables)
  getDebtLentRecords: (type?: DebtLentType, status?: DebtLentStatus, search?: string) => {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (status) params.append("status", status);
    if (search) params.append("search", search);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<DebtLentRecord[]>(`/debt-lent${q}`);
  },

  getDebtLentSummary: () => request<DebtLentSummary>("/debt-lent/summary"),

  getDebtLentById: (id: string) => request<DebtLentRecord>(`/debt-lent/${id}`),

  createDebtLentRecord: (data: DebtLentRequest) =>
    request<DebtLentRecord>("/debt-lent", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDebtLentRecord: (id: string, data: DebtLentRequest) =>
    request<DebtLentRecord>(`/debt-lent/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteDebtLentRecord: (id: string) =>
    request<void>(`/debt-lent/${id}`, {
      method: "DELETE",
    }),

  toggleInstallment: (
    recordId: string,
    installmentId: string,
    data: {
      settled: boolean;
      settledAmount?: number;
      settledDate?: string;
      linkedTransactionId?: string;
      linkedTransactionDescription?: string;
      notes?: string;
    }
  ) =>
    request<DebtLentRecord>(`/debt-lent/${recordId}/installments/${installmentId}/toggle`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteInstallment: (recordId: string, installmentId: string) =>
    request<DebtLentRecord>(`/debt-lent/${recordId}/installments/${installmentId}`, {
      method: "DELETE",
    }),

  recordQuickRepayment: (
    recordId: string,
    amount: number,
    linkedTxnId?: string,
    linkedTxnDesc?: string,
    notes?: string
  ) => {
    const params = new URLSearchParams({ amount: amount.toString() });
    if (linkedTxnId) params.append("linkedTxnId", linkedTxnId);
    if (linkedTxnDesc) params.append("linkedTxnDesc", linkedTxnDesc);
    if (notes) params.append("notes", notes);
    return request<DebtLentRecord>(`/debt-lent/${recordId}/repay?${params.toString()}`, {
      method: "POST",
    });
  },

  getDebtLentCandidates: (search?: string, limit?: number, transactionType?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (limit) params.append("limit", limit.toString());
    if (transactionType) params.append("transactionType", transactionType);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<Transaction[]>(`/debt-lent/candidates${q}`);
  },

  addInstallment: (recordId: string, installment: any) =>
    request<DebtLentRecord>(`/debt-lent/${recordId}/installments`, {
      method: "POST",
      body: JSON.stringify(installment),
    }),

  // Gmail OAuth & Sync
  getGmailStatus: () => request<GmailStatus>("/gmail/status"),
  getGmailConnectUrl: () => request<{ authorizationUrl: string }>("/gmail/connect"),
  triggerSync: () =>
    request<{ processed: number; duplicates: number; needsReview: number; errors: number; message: string }>(
      "/gmail/sync",
      { method: "POST" }
    ),
  disconnectGmail: () =>
    request<void>("/gmail/disconnect", {
      method: "POST",
    }),
  simulateEmailSync: (data: { sender?: string; subject?: string; body: string; messageId?: string }) =>
    request<any>("/gmail/simulate-sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Merchant Rules & Aliases
  getMerchantRules: () => request<MerchantRule[]>("/merchant-rules"),
  saveMerchantRule: (rule: {
    id?: string;
    rawMerchant: string;
    cleanMerchantName: string;
    category: string;
    matchType?: string;
    applyToExisting?: boolean;
  }) =>
    request<MerchantRule>("/merchant-rules", {
      method: "POST",
      body: JSON.stringify(rule),
    }),
  deleteMerchantRule: (id: string) =>
    request<void>(`/merchant-rules/${id}`, {
      method: "DELETE",
    }),
  applyMerchantRule: (id: string) =>
    request<{ ruleId: string; modifiedCount: number }>(`/merchant-rules/${id}/apply`, {
      method: "POST",
    }),
  applyAllMerchantRules: () =>
    request<{ totalModifiedCount: number }>("/merchant-rules/apply-all", {
      method: "POST",
    }),
  previewMerchantCount: (merchant: string, matchType = "CONTAINS") => {
    const params = new URLSearchParams({ merchant, matchType });
    return request<{ merchant: string; matchingCount: number }>(`/merchant-rules/preview-count?${params.toString()}`);
  },

  // Category Budgets & Limits
  getBudgetSummary: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (month) params.append("month", month.toString());
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<BudgetSummaryResponse>(`/budgets${q}`);
  },
  getCategoryBudgets: async (year?: number, month?: number): Promise<CategoryBudgetStatus[]> => {
    const params = new URLSearchParams();
    if (year) params.append("year", year.toString());
    if (month) params.append("month", month.toString());
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await request<any>(`/budgets${q}`);
    if (res && res.categories && Array.isArray(res.categories)) {
      return res.categories;
    }
    if (Array.isArray(res)) {
      return res;
    }
    return [];
  },
  saveCategoryBudget: (
    category: string,
    limitType: string,
    limitValue: number,
    year?: number,
    month?: number,
    applyToUpcoming?: boolean
  ) =>
    request<any>("/budgets", {
      method: "POST",
      body: JSON.stringify({ category, limitType, limitValue, year, month, applyToUpcoming }),
    }),
  saveCategoryBudgetsBulk: (
    data:
      | { category: string; limitType: string; limitValue: number }[]
      | {
          year?: number;
          month?: number;
          applyToUpcoming?: boolean;
          overallLimit?: number;
          budgets: { category: string; limitType: string; limitValue: number }[];
        }
  ) =>
    request<string>("/budgets/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteCategoryBudget: (category: string) =>
    request<void>(`/budgets/${encodeURIComponent(category)}`, {
      method: "DELETE",
    }),


};
