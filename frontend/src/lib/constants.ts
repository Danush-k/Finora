export const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Groceries",
  "Travel & Fuel",
  "Utilities & Bills",
  "Entertainment",
  "Health & Medical",
  "Education & Fees",
  "Investment",
  "Salary & Income",
  "Income",
  "Investment Return",
  "Refund",
  "Transfer",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
