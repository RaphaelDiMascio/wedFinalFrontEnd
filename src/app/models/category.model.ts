import { User } from './user.model';

export interface Category {
  id?: string;
  name: string;
  user?: User | null;
}

