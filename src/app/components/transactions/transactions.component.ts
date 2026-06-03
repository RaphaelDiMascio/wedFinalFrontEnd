import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CategoryService } from '../../services/category.service';
import { TransactionService } from '../../services/transaction.service';
import Swal from 'sweetalert2';

import { User } from '../../models/user.model';
import { Category } from '../../models/category.model';
import { Transaction, TransactionType } from '../../models/transaction.model';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  standalone: false
})
export class TransactionsComponent implements OnInit {
  currentUser: User | null = null;
  
  // Decoupled state variables converted to Signals
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);

  // Filter States
  filterType: '' | TransactionType = '';
  filterCategoryId = '';
  filterStartDate = '';
  filterEndDate = '';
  searchQuery = '';

  // Modals state toggles
  showTransactionModal = false;

  // Form properties
  editingTransaction: Transaction | null = null;
  txName = '';
  txAmount: number | null = null;
  txDescription = '';
  txType: TransactionType = 'EXPENSE';
  txCategoryId = '';
  txDate = '';

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
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();
    console.log("TransactionsComponent: ngOnInit. Current User:", this.currentUser);
    this.loadData();
  }

  loadData(): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.warn("TransactionsComponent: Cannot load data. User or User ID is missing.", this.currentUser);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);

    console.log("TransactionsComponent: Fetching categories...");
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        console.log("TransactionsComponent: Successfully loaded categories count:", cats.length);
        this.categories.set(cats);
        this.fetchTransactions();
      },
      error: (err) => {
        console.error('TransactionsComponent: Error fetching categories:', err);
        this.isLoading.set(false);
      }
    });
  }

  fetchTransactions(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.isLoading.set(false);
      return;
    }
    
    console.log("TransactionsComponent: Fetching transactions for user:", this.currentUser.id);
    this.transactionService.searchTransactions({ userId: this.currentUser.id }).subscribe({
      next: (txs) => {
        try {
          console.log("TransactionsComponent: Successfully loaded transactions count:", txs ? txs.length : 0);
          const rawTxs = txs || [];
          const sorted = [...rawTxs].sort((a, b) => {
            const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
            const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
            return dateB - dateA;
          });
          this.transactions.set(sorted);
        } catch (e) {
          console.error("TransactionsComponent: Exception sorting transactions:", e);
          this.transactions.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('TransactionsComponent: Error fetching transactions:', err);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryColor(name: string): string {
    return this.categoryColors[name] || '#8e9aaf';
  }

  get filteredTransactions(): Transaction[] {
    const list = this.transactions() || [];
    return list.filter((tx) => {
      if (this.filterType && tx.transactionType !== this.filterType) return false;
      if (this.filterCategoryId && (!tx.category || tx.category.id !== this.filterCategoryId)) return false;
      
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchesName = tx.name.toLowerCase().includes(query);
        const matchesDesc = tx.description ? tx.description.toLowerCase().includes(query) : false;
        const matchesCat = tx.category.name.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      if (tx.transactionDate) {
        const txDateObj = new Date(tx.transactionDate);
        if (this.filterStartDate) {
          const start = new Date(this.filterStartDate);
          if (txDateObj < start) return false;
        }
        if (this.filterEndDate) {
          const end = new Date(this.filterEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDateObj > end) return false;
        }
      }

      return true;
    });
  }

  openTransactionModal(tx: Transaction | null = null): void {
    if (tx) {
      this.editingTransaction = tx;
      this.txName = tx.name;
      this.txAmount = tx.amount;
      this.txDescription = tx.description || '';
      this.txType = tx.transactionType;
      this.txCategoryId = tx.category.id || '';
      
      if (tx.transactionDate) {
        const d = new Date(tx.transactionDate);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          this.txDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } else {
          this.txDate = '';
        }
      } else {
        this.txDate = '';
      }
    } else {
      this.editingTransaction = null;
      this.txName = '';
      this.txAmount = null;
      this.txDescription = '';
      this.txType = 'EXPENSE';
      this.txCategoryId = this.categories().length > 0 ? (this.categories()[0].id || '') : '';
      
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      this.txDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    
    this.showTransactionModal = true;
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.editingTransaction = null;
  }

  submitTransaction(): void {
    if (!this.currentUser || !this.currentUser.id || !this.txName.trim() || this.txAmount === null || this.txAmount <= 0 || !this.txCategoryId) {
      Swal.fire({
        icon: 'warning',
        title: 'Champs requis',
        text: 'Veuillez remplir tous les champs obligatoires.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const payload: Partial<Transaction> = {
      name: this.txName.trim(),
      amount: this.txAmount,
      description: this.txDescription.trim(),
      transactionType: this.txType,
      transactionDate: this.txDate
    };

    if (this.editingTransaction && this.editingTransaction.id) {
      this.transactionService.updateTransaction(this.editingTransaction.id, payload, this.txCategoryId).subscribe({
        next: () => {
          this.closeTransactionModal();
          this.fetchTransactions();
          Swal.fire({
            icon: 'success',
            title: 'Transaction enregistrée !',
            text: 'La transaction a été sauvegardée avec succès.',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error('Error updating transaction:', err);
          const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la modification de la transaction.';
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: errMsg,
            confirmButtonColor: '#3085d6'
          });
        }
      });
    } else {
      this.transactionService.createTransaction(payload, this.currentUser.id, this.txCategoryId).subscribe({
        next: () => {
          this.closeTransactionModal();
          this.fetchTransactions();
          Swal.fire({
            icon: 'success',
            title: 'Transaction enregistrée !',
            text: 'La transaction a été sauvegardée avec succès.',
            timer: 1500,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error('Error creating transaction:', err);
          const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la création de la transaction.';
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: errMsg,
            confirmButtonColor: '#3085d6'
          });
        }
      });
    }
  }

  deleteTransaction(id: string): void {
    Swal.fire({
      title: 'Voulez-vous vraiment supprimer cette transaction ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.transactionService.deleteTransaction(id).subscribe({
          next: () => {
            this.fetchTransactions();
            Swal.fire({
              icon: 'success',
              title: 'Supprimée !',
              text: 'La transaction a été supprimée.',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            console.error('Error deleting transaction:', err);
            const errMsg = (typeof err?.error === 'string' ? err.error : (err?.error?.text || err?.error?.message || err?.message)) || 'Erreur lors de la suppression de la transaction.';
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

  clearFilters(): void {
    this.filterType = '';
    this.filterCategoryId = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.searchQuery = '';
  }

  get totalFilteredIncome(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'INCOME')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }

  get totalFilteredExpense(): number {
    return this.filteredTransactions
      .filter(tx => tx.transactionType === 'EXPENSE')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }
}
