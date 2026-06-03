import { Category } from './category.model';
import { Transaction } from './transaction.model';
import { SavingsGoal } from './savings-goal.model';

export interface CategorySpending {
  category: Category;
  amount: number;
  percentage: number;
}

export interface DashboardSummary {
  totalBalance: number;
  availableBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  categorySpending: CategorySpending[];
  insights: string[];
  recentTransactions: Transaction[];
  savingsGoals: SavingsGoal[];
  activeYear?: number;
  activeMonth?: number;
}
