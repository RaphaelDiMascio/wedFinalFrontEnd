import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SavingsGoalService } from '../../services/savings-goal.service';
import { TransactionService } from '../../services/transaction.service';
import { SavingsGoal } from '../../models/savings-goal.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-savings-goals',
  templateUrl: './savings-goals.component.html',
  standalone: false
})
export class SavingsGoalsComponent implements OnInit {
  currentUser: User | null = null;
  
  // Decoupled state variables converted to Signals
  readonly savingsGoals = signal<SavingsGoal[]>([]);
  readonly isLoading = signal(false);
  readonly availableBalance = signal(0);

  // Modals state toggles
  showGoalModal = false;
  showProgressGoalModal = false;

  // Add Savings Goal Form variables
  goalName = '';
  goalDescription = '';
  goalTargetAmount: number | null = null;
  goalDeadline = '';

  // Update Goal Progress Form variables
  selectedGoal: SavingsGoal | null = null;
  goalProgressAmount: number | null = null;

  // Monthly Savings Simulator variables
  simTargetAmount: number | null = null;
  simMonthsCount: number | null = null;

  get simMonthlyContribution(): number | null {
    if (this.simTargetAmount === null || this.simMonthsCount === null || this.simMonthsCount <= 0) {
      return null;
    }
    return this.simTargetAmount / this.simMonthsCount;
  }

  constructor(
    private authService: AuthService,
    private savingsGoalService: SavingsGoalService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();
    console.log("SavingsGoalsComponent: ngOnInit. Current User:", this.currentUser);
    this.loadGoals();
  }

  loadGoals(): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn("SavingsGoalsComponent: Cannot load data. User or User ID is missing.", this.currentUser);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    const userId = this.currentUser.id;
    
    console.log("SavingsGoalsComponent: Fetching goals for user:", userId);
    this.savingsGoalService.getGoalsByUserId(userId).subscribe({
      next: (goals) => {
        console.log("SavingsGoalsComponent: Successfully loaded goals count:", goals.length);
        this.savingsGoals.set(goals ? [...goals] : []);
        
        // Also load available balance to validate progress adjustments
        this.transactionService.getDashboardSummary(userId).subscribe({
          next: (summary) => {
            this.availableBalance.set(summary.availableBalance || 0);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('SavingsGoalsComponent: Error fetching dashboard summary:', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('SavingsGoalsComponent: Error fetching savings goals:', err);
        this.isLoading.set(false);
      }
    });
  }

  openGoalModal(): void {
    this.goalName = '';
    this.goalDescription = '';
    this.goalTargetAmount = null;
    
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.goalDeadline = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    this.showGoalModal = true;
  }

  closeGoalModal(): void {
    this.showGoalModal = false;
  }

  openProgressGoalModal(goal: SavingsGoal): void {
    this.selectedGoal = goal;
    this.goalProgressAmount = goal.currentAmount;
    this.showProgressGoalModal = true;
  }

  closeProgressGoalModal(): void {
    this.showProgressGoalModal = false;
    this.selectedGoal = null;
  }

  submitGoal(): void {
    if (!this.currentUser || !this.currentUser.id || !this.goalName.trim() || this.goalTargetAmount === null || this.goalTargetAmount <= 0 || !this.goalDeadline) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const payload: Partial<SavingsGoal> = {
      name: this.goalName.trim(),
      description: this.goalDescription.trim(),
      amount: this.goalTargetAmount,
      currentAmount: 0.0,
      deadline: this.goalDeadline
    };

    this.savingsGoalService.createGoal(payload, this.currentUser.id).subscribe({
      next: () => {
        this.closeGoalModal();
        this.loadGoals();
      },
      error: (err) => console.error('Error creating savings goal:', err)
    });
  }

  submitProgressUpdate(): void {
    if (!this.selectedGoal || !this.selectedGoal.id || this.goalProgressAmount === null || this.goalProgressAmount < 0) {
      alert("Veuillez saisir un montant d'épargne valide.");
      return;
    }

    const oldAmount = this.selectedGoal.currentAmount || 0;
    const diff = this.goalProgressAmount - oldAmount;

    if (diff > 0 && diff > this.availableBalance()) {
      alert(`Solde insuffisant sur votre compte courant pour effectuer ce transfert d'épargne !\n\nSolde disponible : ${this.availableBalance().toLocaleString()} €\nMontant requis : ${diff.toLocaleString()} €`);
      return;
    }

    this.savingsGoalService.updateProgress(this.selectedGoal.id, this.goalProgressAmount).subscribe({
      next: () => {
        this.closeProgressGoalModal();
        this.loadGoals();
      },
      error: (err: any) => {
        console.error('Error updating goal progress:', err);
        const errMsg = err?.error?.message || err?.message || "Erreur lors de la mise à jour.";
        alert(`Échec de l'ajustement : ${errMsg}`);
      }
    });
  }

  deleteGoal(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cet objectif d\'épargne ?')) {
      this.savingsGoalService.deleteGoal(id).subscribe({
        next: () => {
          this.loadGoals();
        },
        error: (err) => console.error('Error deleting goal:', err)
      });
    }
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
