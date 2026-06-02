import { Component, OnInit, Output, EventEmitter, signal, computed } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { CategoryService } from '../../../services/category.service';
import { TransactionService } from '../../../services/transaction.service';
import { SavingsGoalService } from '../../../services/savings-goal.service';

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

  // State variables converted to Angular Signals for reactive zoneless change detection
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
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

  // categories déjà défnii en base
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
    private categoryService: CategoryService,
    private transactionService: TransactionService,
    private savingsGoalService: SavingsGoalService
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

    console.log("OverviewComponent: Fetching categories for user:", userId);
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        console.log("OverviewComponent: Successfully loaded categories count:", cats.length);
        this.categories.set(cats);
        this.fetchTransactionsAndGoals(userId);
      },
      error: (err) => {
        console.error('OverviewComponent: Error fetching categories:', err);
        this.isLoading.set(false);
      }
    });
  }

  fetchTransactionsAndGoals(userId: string): void {
    console.log("OverviewComponent: Fetching transactions for user:", userId);
    this.transactionService.searchTransactions({ userId }).subscribe({
      next: (txs) => {
        try {
          console.log("OverviewComponent: Successfully loaded transactions count:", txs ? txs.length : 0);
          const rawTxs = txs || [];
          const sorted = [...rawTxs].sort((a, b) => {
            const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
            const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
            return dateB - dateA;
          });
          this.transactions.set(sorted);
        } catch (e) {
          console.error("OverviewComponent: Exception parsing transactions:", e);
          this.transactions.set([]);
        }

        console.log("OverviewComponent: Fetching savings goals for user:", userId);
        this.savingsGoalService.getGoalsByUserId(userId).subscribe({
          next: (goals) => {
            try {
              console.log("OverviewComponent: Successfully loaded savings goals count:", goals ? goals.length : 0);
              this.savingsGoals.set(goals ? [...goals] : []);
              this.calculateFinancials();
            } catch (e) {
              console.error("OverviewComponent: Exception processing goals overview:", e);
            }
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('OverviewComponent: Error fetching savings goals:', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('OverviewComponent: Error fetching transactions:', err);
        this.isLoading.set(false);
      }
    });
  }

  calculateFinancials(): void {
    try {
      let income = 0;
      let expense = 0;
      const expenseByCat: { [catId: string]: number } = {};

      const txList = this.transactions() || [];
      txList.forEach((tx) => {
        if (!tx) return;
        if (tx.transactionType === 'INCOME') {
          income += tx.amount || 0;
        } else {
          expense += tx.amount || 0;
          if (tx.category && tx.category.id) {
            expenseByCat[tx.category.id] = (expenseByCat[tx.category.id] || 0) + (tx.amount || 0);
          }
        }
      });

      this.totalIncome.set(income);
      this.totalExpense.set(expense);
      this.totalBalance.set(income - expense);

      // Goal savings sum
      const goalsList = this.savingsGoals() || [];
      const sumSavings = goalsList.reduce((sum, goal) => sum + ((goal && goal.currentAmount) || 0), 0);
      this.totalSavings.set(sumSavings);

      // Chart slices
      const spending: { category: Category; amount: number; percentage: number; color: string }[] = [];
      Object.keys(expenseByCat).forEach((catId) => {
        const category = this.categories().find(c => c.id === catId);
        if (category) {
          const amt = expenseByCat[catId];
          const percentage = expense > 0 ? (amt / expense) * 100 : 0;
          spending.push({
            category,
            amount: amt,
            percentage,
            color: this.getCategoryColor(category.name)
          });
        }
      });

      this.categorySpending.set(spending.sort((a, b) => b.amount - a.amount));
      this.generateInsights();
    } catch (e) {
      console.error("OverviewComponent: Exception calculating financials:", e);
    }
  }

  getCategoryColor(name: string): string {
    return this.categoryColors[name] || '#8e9aaf';
  }

  generateInsights(): void {
    const list: string[] = [];
    const txList = this.transactions();

    if (txList.length === 0) {
      list.push("Bienvenue ! Ajoutez vos premières transactions pour recevoir des analyses personnalisées.");
      this.insights.set(list);
      return;
    }

    if (this.totalExpense() > this.totalIncome()) {
      list.push("Attention : Vos dépenses mensuelles dépassent vos revenus. Pensez à limiter vos achats non essentiels.");
    } else if (this.totalIncome() > 0) {
      const savingsRate = ((this.totalIncome() - this.totalExpense()) / this.totalIncome()) * 100;
      list.push(`Bravo ! Vous épargnez actuellement ${savingsRate.toFixed(0)}% de vos revenus ce mois-ci.`);
    }

    const spendingList = this.categorySpending();
    if (spendingList.length > 0) {
      const topExpense = spendingList[0];
      list.push(`Votre poste de dépense principal est "${topExpense.category.name}" avec un montant cumulé de ${topExpense.amount.toLocaleString()} € (${topExpense.percentage.toFixed(0)}% des dépenses).`);
    }

    const activeGoals = this.savingsGoals().filter(g => g.currentAmount < g.amount);
    if (activeGoals.length > 0) {
      const closestGoal = activeGoals[0];
      const percent = (closestGoal.currentAmount / closestGoal.amount) * 100;
      list.push(`Votre objectif "${closestGoal.name}" est complété à ${percent.toFixed(0)}%. Vous y êtes presque !`);
    }

    this.insights.set(list);
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
