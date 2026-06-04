import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SavingsGoalService } from '../../services/savings-goal.service';
import { TransactionService } from '../../services/transaction.service';
import { SavingsGoal } from '../../models/savings-goal.model';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';

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
  showEditGoalModal = false;

  // Add Savings Goal Form variables
  goalName = '';
  goalDescription = '';
  goalTargetAmount: number | null = null;
  goalDeadline = '';

  // Edit Savings Goal Form variables
  editingGoalId: string | null = null;
  editGoalName = '';
  editGoalDescription = '';
  editGoalTargetAmount: number | null = null;
  editGoalDeadline = '';

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
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez remplir tous les champs obligatoires.',
        confirmButtonColor: '#3085d6'
      });
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
        Swal.fire({
          icon: 'success',
          title: 'Objectif créé !',
          text: 'Votre objectif d\'épargne a été enregistré.',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error creating savings goal:', err);
        const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la création de l\'objectif d\'épargne.';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errMsg,
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  submitProgressUpdate(): void {
    if (!this.selectedGoal || !this.selectedGoal.id || this.goalProgressAmount === null || this.goalProgressAmount < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Montant invalide',
        text: 'Veuillez saisir un montant d\'épargne valide.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const oldAmount = this.selectedGoal.currentAmount || 0;
    const diff = this.goalProgressAmount - oldAmount;

    if (diff > 0 && diff > this.availableBalance()) {
      Swal.fire({
        icon: 'error',
        title: 'Solde insuffisant',
        text: `Solde insuffisant sur votre compte courant pour effectuer ce transfert d'épargne !\n\nSolde disponible : ${this.availableBalance().toLocaleString()} €\nMontant requis : ${diff.toLocaleString()} €`,
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    this.savingsGoalService.updateProgress(this.selectedGoal.id, this.goalProgressAmount).subscribe({
      next: () => {
        this.closeProgressGoalModal();
        this.loadGoals();
        Swal.fire({
          icon: 'success',
          title: 'Progression mise à jour !',
          text: 'Votre épargne a été ajustée.',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        console.error('Error updating goal progress:', err);
        const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message || "Erreur lors de la mise à jour."));
        Swal.fire({
          icon: 'error',
          title: 'Échec de l\'ajustement',
          text: errMsg,
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  deleteGoal(id: string): void {
    Swal.fire({
      title: 'Voulez-vous vraiment supprimer cet objectif d\'épargne ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.savingsGoalService.deleteGoal(id).subscribe({
          next: () => {
            this.loadGoals();
            Swal.fire({
              icon: 'success',
              title: 'Supprimé !',
              text: 'L\'objectif a été supprimé.',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            console.error('Error deleting goal:', err);
            const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la suppression de l\'objectif.';
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: errMsg,
              confirmButtonColor: '#3085d6'
            });
          }
        });
      }
    });
  }

  openEditGoalModal(goal: SavingsGoal): void {
    if (!goal || !goal.id) return;
    this.editingGoalId = goal.id;
    this.editGoalName = goal.name;
    this.editGoalDescription = goal.description || '';
    this.editGoalTargetAmount = goal.amount;
    this.editGoalDeadline = goal.deadline;
    this.showEditGoalModal = true;
  }

  closeEditGoalModal(): void {
    this.showEditGoalModal = false;
    this.editingGoalId = null;
  }

  submitEditGoal(): void {
    if (!this.editingGoalId || !this.editGoalName.trim() || this.editGoalTargetAmount === null || this.editGoalTargetAmount <= 0 || !this.editGoalDeadline) {
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez remplir tous les champs obligatoires.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const payload: Partial<SavingsGoal> = {
      name: this.editGoalName.trim(),
      description: this.editGoalDescription.trim(),
      amount: this.editGoalTargetAmount,
      deadline: this.editGoalDeadline
    };

    this.savingsGoalService.updateGoal(this.editingGoalId, payload).subscribe({
      next: () => {
        this.closeEditGoalModal();
        this.loadGoals();
        Swal.fire({
          icon: 'success',
          title: 'Objectif modifié !',
          text: 'Votre poche d\'épargne a été mise à jour.',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error updating savings goal:', err);
        const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la modification de l\'objectif d\'épargne.';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errMsg,
          confirmButtonColor: '#3085d6'
        });
      }
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
