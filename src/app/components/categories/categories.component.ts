import { Component, OnInit, signal } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  standalone: false
})
export class CategoriesComponent implements OnInit {
  // Decoupled state variables converted to Signals
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);

  showCategoryModal = false;
  newCategoryName = '';

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

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    console.log("CategoriesComponent: Fetching categories...");
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        console.log("CategoriesComponent: Successfully loaded categories count:", cats.length);
        this.categories.set(cats ? [...cats] : []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('CategoriesComponent: Error fetching categories:', err);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryColor(name: string): string {
    return this.categoryColors[name] || '#8e9aaf';
  }

  submitCategory(): void {
    if (!this.newCategoryName.trim()) {
      alert('Veuillez spécifier un nom de catégorie.');
      return;
    }

    this.categoryService.createCategory(this.newCategoryName.trim()).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.showCategoryModal = false;
        this.loadCategories();
      },
      error: (err) => {
        alert('Cette catégorie existe déjà ou est invalide.');
        console.error(err);
      }
    });
  }

  deleteCategory(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette catégorie ? Toutes les transactions associées devront être mises à jour.')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (err) => console.error('Error deleting category:', err)
      });
    }
  }
}
