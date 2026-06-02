import { User } from './user.model';

export interface SavingsGoal {
  id?: string;
  name: string;
  description?: string;
  amount: number;
  currentAmount: number;
  deadline: string; // Format: "yyyy-MM-dd"
  user?: User;
}
