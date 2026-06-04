import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SavingsGoal } from '../models/savings-goal.model';

@Injectable({
  providedIn: 'root'
})
export class SavingsGoalService {
  private readonly apiUrl = `${environment.apiUrl}/savings-goals`;

  constructor(private http: HttpClient) {}

  getGoalsByUserId(userId: string): Observable<SavingsGoal[]> {
    return this.http.get<SavingsGoal[]>(`${this.apiUrl}/user/${userId}`);
  }

  createGoal(goal: Partial<SavingsGoal>, userId: string): Observable<SavingsGoal> {
    const params = new HttpParams().set('userId', userId);
    
    // Ensure deadline is in yyyy-MM-dd format
    const formattedGoal = {
      ...goal,
      deadline: this.formatDate(goal.deadline || new Date().toISOString())
    };

    return this.http.post<SavingsGoal>(this.apiUrl, formattedGoal, { params });
  }

  updateProgress(id: string, currentAmount: number): Observable<SavingsGoal> {
    const params = new HttpParams().set('currentAmount', currentAmount.toString());
    return this.http.put<SavingsGoal>(`${this.apiUrl}/${id}/progress`, null, { params });
  }

  updateGoal(id: string, goal: Partial<SavingsGoal>): Observable<SavingsGoal> {
    const formattedGoal = {
      ...goal,
      deadline: this.formatDate(goal.deadline || new Date().toISOString())
    };
    return this.http.put<SavingsGoal>(`${this.apiUrl}/${id}`, formattedGoal);
  }

  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Format Helper: ISO date string to "yyyy-MM-dd"
  private formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    
    if (isNaN(d.getTime())) {
      return dateStr;
    }

    const pad = (num: number) => String(num).padStart(2, '0');
    
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());

    return `${year}-${month}-${day}`;
  }
}
