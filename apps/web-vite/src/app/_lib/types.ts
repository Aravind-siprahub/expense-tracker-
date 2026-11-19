export type Role = 'ADMIN' | 'MEMBER';

export interface Me {
  user: { id: string; email: string; name: string };
  family: { id: string; name: string; role: Role } | null;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface Expense {
  id: string;
  amountPaise: number;
  date: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  note: string | null;
  categoryId: string;
  category: string;
  userId: string;
  by: string;
  // The saved card / bank account used. Only present for the person who made the expense.
  paymentMethodId?: string | null;
  paymentMethodLabel?: string | null;
  paymentMethodRemoved?: boolean;
  alert?: { category: string; overByPaise: number } | null;
}

/** A card or bank account saved by the logged-in user. Numbers are always masked. */
export interface SavedMethod {
  id: string;
  type: 'CARD' | 'BANK';
  nickname: string | null;
  cardType: 'CREDIT' | 'DEBIT' | null;
  lastFour: string;
  maskedNumber: string;
  label: string;
  isDefault: boolean;
}

export interface IncomeEntry {
  id: string;
  type: 'SALARY' | 'OTHER';
  amountPaise: number;
  month: string;
  note: string | null;
  userId: string;
  createdById: string | null;
  member: string;
}

export interface FamilyInfo {
  id: string;
  name: string;
  members: { userId: string; name: string; email: string; role: Role; spentPaise: number }[];
}

export interface Summary {
  month: string;
  incomePaise: number;
  expensesPaise: number;
  remainingPaise: number;
  savingsPaise?: number;
  savingsRate?: number;
  totalBudgetPaise: number | null;
  remainingBudgetPaise?: number | null;
  byCategory: { categoryId: string; name: string; spentPaise: number; budgetPaise: number }[];
  byMember: { userId: string; name: string; spentPaise: number }[];
  recent: {
    id: string;
    date: string;
    categoryId: string;
    category: string;
    by: string;
    paymentMethod: string;
    note: string | null;
    amountPaise: number;
  }[];
  overBudget: { name: string; overByPaise: number }[];
  budgetAlerts?: {
    overBudget: { categoryId: string; name: string; spentPaise: number; budgetPaise: number; overByPaise: number; percent: number }[];
    nearBudget: { categoryId: string; name: string; spentPaise: number; budgetPaise: number; remainingPaise: number; percent: number }[];
  };
  previousMonth: {
    month: string;
    incomePaise: number;
    expensesPaise: number;
    changePaise: number;
    changePercent: number | null;
  };
}

export interface ExpenseListResponse {
  totalPaise: number;
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items: Expense[];
}

export interface BudgetView {
  month: string;
  totalPaise: number | null;
  categories: {
    categoryId: string;
    name: string;
    budgetPaise: number;
    spentPaise: number;
    remainingPaise: number;
    over: boolean;
  }[];
}
