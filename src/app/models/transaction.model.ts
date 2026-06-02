import { Category } from './category.model';
import { User } from './user.model';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id?: string;
  name: string;
  description?: string;
  amount: number;
  transactionDate?: string; // Format: "yyyy-MM-dd HH:mm"
  transactionType: TransactionType;
  category: Category;
  user?: User;
}
