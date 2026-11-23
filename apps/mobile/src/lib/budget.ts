// The "total budget" rule, shared by the Budget screen and covered by tests.
// It mirrors the server (apps/backend/src/routes/summary.ts): the explicit total wins; when none is set, the total
// is the sum of the category budgets; when neither exists the total is 0 ("not set").

export interface EffectiveBudget {
  /** The total to display and to compare spending against, in paise. */
  totalPaise: number;
  /** True when the total comes from the category budgets rather than an explicit total. */
  derived: boolean;
}

export function effectiveBudget(explicitTotalPaise: number, categoryBudgetsPaise: number[]): EffectiveBudget {
  const explicit = Number.isFinite(explicitTotalPaise) && explicitTotalPaise > 0 ? explicitTotalPaise : 0;
  const sum = categoryBudgetsPaise.reduce((s, p) => s + (Number.isFinite(p) && p > 0 ? p : 0), 0);
  if (explicit > 0) return { totalPaise: explicit, derived: false };
  return { totalPaise: sum, derived: sum > 0 };
}
