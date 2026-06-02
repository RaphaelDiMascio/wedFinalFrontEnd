import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { TransactionService } from '../../../services/transaction.service';

import { User } from '../../../models/user.model';
import { Category } from '../../../models/category.model';
import { Transaction } from '../../../models/transaction.model';
import { SavingsGoal } from '../../../models/savings-goal.model';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  standalone: false
})
export class OverviewComponent implements OnInit {
  @Output() viewChange = new EventEmitter<'overview' | 'transactions' | 'goals' | 'categories'>();

  currentUser: User | null = null;
  
  // State variables from Signals
  readonly transactions = signal<Transaction[]>([]);
  readonly savingsGoals = signal<SavingsGoal[]>([]);
  readonly isLoading = signal(false);

  // Aggregates Signals
  readonly totalBalance = signal(0);
  readonly totalIncome = signal(0);
  readonly totalExpense = signal(0);
  readonly totalSavings = signal(0);

  // Breakdown & insights
  readonly categorySpending = signal<{ category: Category; amount: number; percentage: number; color: string }[]>([]);
  readonly insights = signal<string[]>([]);

  // Chart SVG Dasharray Helpers
  chartDonutCircumference = 314.159;

  private readonly categoryColors: { [key: string]: string } = {
    'Alimentation': '#f59e0b',
    'Logement': '#3b82f6',
    'Loisirs': '#ec4899',
    'Transport': '#8b5cf6',
    'Santé': '#ef4444',
    'Factures & Services': '#06b6d4',
    'Salaire': '#10b981',
    'Épargne & Investissement': '#14b8a6',
    'Cadeaux & Dons': '#f43f5e',
    'Autre': '#64748b'
  };

  constructor(
    private authService: AuthService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();
    console.log("OverviewComponent: ngOnInit. Current User:", this.currentUser);
    this.loadOverviewData();
  }

  changeView(tab: 'overview' | 'transactions' | 'goals' | 'categories'): void {
    this.viewChange.emit(tab);
  }

  loadOverviewData(): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn("OverviewComponent: Cannot load data. User or User ID is missing.", this.currentUser);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    const userId = this.currentUser.id;

    console.log("OverviewComponent: Fetching dashboard summary from backend...");
    this.transactionService.getDashboardSummary(userId).subscribe({
      next: (summary) => {
        try {
          console.log("OverviewComponent: Successfully loaded backend summary:", summary);
          this.totalBalance.set(summary.totalBalance || 0);
          this.totalIncome.set(summary.totalIncome || 0);
          this.totalExpense.set(summary.totalExpense || 0);
          this.totalSavings.set(summary.totalSavings || 0);
          
          // Map and add colors to category spending
          const mappedSpending = (summary.categorySpending || []).map(item => ({
            ...item,
            color: this.getCategoryColor(item.category.name)
          }));
          this.categorySpending.set(mappedSpending);

          this.insights.set(summary.insights || []);
          this.transactions.set(summary.recentTransactions || []);
          this.savingsGoals.set(summary.savingsGoals || []);
        } catch (e) {
          console.error("OverviewComponent: Exception parsing dashboard summary:", e);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('OverviewComponent: Error fetching dashboard summary:', err);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryColor(name: string): string {
    return this.categoryColors[name] || '#8e9aaf';
  }

  getChartSlices(): { strokeDashArray: string; strokeDashOffset: number; color: string; name: string }[] {
    let accumulatedPercent = 0;
    return this.categorySpending().map((item) => {
      const sliceSize = item.percentage;
      const strokeDashOffset = -((accumulatedPercent / 100) * this.chartDonutCircumference);
      const strokeDashArray = `${(sliceSize / 100) * this.chartDonutCircumference} ${this.chartDonutCircumference}`;
      accumulatedPercent += sliceSize;
      
      return {
        strokeDashArray,
        strokeDashOffset,
        color: item.color,
        name: item.category.name
      };
    });
  }

  getDaysRemaining(deadlineStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
