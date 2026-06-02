import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Transaction, TransactionType } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  getTransactionById(id: string): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }

  createTransaction(transaction: Partial<Transaction>, userId: string, categoryId: string): Observable<Transaction> {
    let params = new HttpParams()
      .set('userId', userId)
      .set('categoryId', categoryId);

    // Format transaction date to yyyy-MM-dd HH:mm as expected by backend's @JsonFormat
    const formattedTransaction = {
      ...transaction,
      transactionDate: this.formatDateTime(transaction.transactionDate || new Date().toISOString())
    };

    return this.http.post<Transaction>(this.apiUrl, formattedTransaction, { params });
  }

  updateTransaction(id: string, transaction: Partial<Transaction>, categoryId?: string): Observable<Transaction> {
    let params = new HttpParams();
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

    // Format transaction date if present
    const formattedTransaction = {
      ...transaction
    };
    if (transaction.transactionDate) {
      formattedTransaction.transactionDate = this.formatDateTime(transaction.transactionDate);
    }

    return this.http.put<Transaction>(`${this.apiUrl}/${id}`, formattedTransaction, { params });
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  searchTransactions(filters: {
    userId: string;
    startDate?: string; // yyyy-MM-dd
    endDate?: string;   // yyyy-MM-dd
    categoryId?: string;
    type?: TransactionType;
  }): Observable<Transaction[]> {
    let params = new HttpParams().set('userId', filters.userId);

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }

    return this.http.get<Transaction[]>(`${this.apiUrl}/search`, { params });
  }

  // Format Helper: ISO date string to "yyyy-MM-dd HH:mm"
  private formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    
    // Check if valid date
    if (isNaN(d.getTime())) {
      return dateStr;
    }

    const pad = (num: number) => String(num).padStart(2, '0');
    
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
