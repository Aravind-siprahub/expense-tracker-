// Mock data taken from the PRD sample (November). Replace with API calls later.

export const inr = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export type Payment = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';

export const categories = [
  'Food & Dining',
  'Groceries',
  'Rent & Housing',
  'Electricity & Bills',
  'Medical & Healthcare',
  'Entertainment',
  'Transport & Fuel',
  'Education',
  'Shopping',
  'Travel',
  'Insurance',
  'EMI & Loans',
  'Personal Expenses',
  'Others',
];

export const customCategories = ['Pet Care'];

export const categoryExamples: Record<string, string> = {
  'Food & Dining': 'Restaurants, takeaway, cafes',
  Groceries: 'Vegetables, milk, monthly provisions',
  'Rent & Housing': 'Rent, maintenance, repairs',
  'Electricity & Bills': 'Electricity, water, gas, internet, mobile',
  'Medical & Healthcare': 'Doctor visits, medicines, tests',
  Entertainment: 'Movies, subscriptions, outings',
  'Transport & Fuel': 'Petrol, bus, metro, auto, cab',
  Education: 'School fees, books, tuition',
  Shopping: 'Clothes, electronics, household items',
  Travel: 'Tickets, hotels, trips',
  Insurance: 'Health, life, vehicle premiums',
  'EMI & Loans': 'Home, car and personal loan payments',
  'Personal Expenses': 'Salon, gym, hobbies',
  Others: 'Anything that does not fit above',
};

export const income = { total: 80000, expenses: 57000, remaining: 23000 };

export const budgets = [
  { category: 'Rent & Housing', budget: 18000, spent: 18000 },
  { category: 'Groceries', budget: 10000, spent: 9500 },
  { category: 'Transport & Fuel', budget: 6000, spent: 5500 },
  { category: 'Education', budget: 6000, spent: 6000 },
  { category: 'Food & Dining', budget: 4000, spent: 4200 },
  { category: 'Shopping', budget: 4000, spent: 4000 },
  { category: 'Electricity & Bills', budget: 4000, spent: 3800 },
  { category: 'Medical & Healthcare', budget: 3000, spent: 2600 },
  { category: 'Entertainment', budget: 3000, spent: 2400 },
  { category: 'Others', budget: 2000, spent: 1000 },
];

export const members = [
  { name: 'Rajesh', role: 'Admin', spent: 24000, email: 'rajesh@example.com' },
  { name: 'Priya', role: 'Member', spent: 21000, email: 'priya@example.com' },
  { name: 'Aarav', role: 'Member', spent: 7000, email: 'aarav@example.com' },
  { name: 'Ananya', role: 'Member', spent: 5000, email: 'ananya@example.com' },
];

export const transactions: {
  id: number;
  date: string;
  category: string;
  note: string;
  by: string;
  payment: Payment;
  amount: number;
}[] = [
  { id: 5, date: '05 Nov', category: 'Entertainment', note: 'Movie', by: 'Aarav', payment: 'UPI', amount: 600 },
  { id: 4, date: '04 Nov', category: 'Transport & Fuel', note: 'Petrol', by: 'Rajesh', payment: 'Cash', amount: 1000 },
  { id: 3, date: '03 Nov', category: 'Medical & Healthcare', note: 'Medicines', by: 'Priya', payment: 'Cash', amount: 350 },
  { id: 2, date: '02 Nov', category: 'Food & Dining', note: 'Restaurant', by: 'Rajesh', payment: 'Card', amount: 850 },
  { id: 1, date: '01 Nov', category: 'Groceries', note: 'Vegetables', by: 'Priya', payment: 'UPI', amount: 500 },
];

export const incomeEntries = [
  { id: 1, type: 'Salary', member: 'Rajesh', month: 'Nov 2026', note: '', amount: 75000 },
  { id: 2, type: 'Other', member: 'Priya', month: 'Nov 2026', note: 'Freelance work', amount: 5000 },
];

export const lastMonth = { expenses: 54500 };
