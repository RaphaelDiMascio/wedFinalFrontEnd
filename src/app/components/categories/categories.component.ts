import { Component, OnInit, signal } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  standalone: false,
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
      },
    });
  }

  getCategoryColor(name: string): string {
    return this.categoryColors[name] || '#8e9aaf';
  }

  submitCategory(): void {
    if (!this.newCategoryName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez spécifier un nom de catégorie.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    this.categoryService.createCategory(this.newCategoryName.trim()).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.showCategoryModal = false;
        this.loadCategories();
        Swal.fire({
          icon: 'success',
          title: 'Catégorie créée !',
          text: 'La catégorie a été ajoutée avec succès.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        const errMsg =
          (typeof err?.error === 'string'
            ? err.error
            : err?.error?.text || err?.error?.message || err?.message) ||
          'Cette catégorie existe déjà ou est invalide.';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errMsg,
          confirmButtonColor: '#3085d6',
        });
        console.error(err);
      },
    });
  }

  deleteCategory(id: string): void {
    const category = this.categories().find(c => c.id === id);
    if (category && !category.user) {
      Swal.fire({
        icon: 'error',
        title: 'Action impossible',
        text: 'Les catégories globales partagées ne peuvent pas être supprimées.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    Swal.fire({
      title: 'Voulez-vous vraiment supprimer cette catégorie ?',
      text: 'Toutes les transactions associées devront être mises à jour.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    }).then((result) => {

      if (result.isConfirmed) {
        this.categoryService.deleteCategory(id).subscribe({
          next: () => {
            this.loadCategories();
            Swal.fire({
              icon: 'success',
              title: 'Supprimée !',
              text: 'La catégorie a été supprimée.',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (err) => {
            const errMsg =
              (typeof err?.error === 'string'
                ? err.error
                : err?.error?.text || err?.error?.message || err?.message) ||
              'Erreur lors de la suppression de la catégorie.';
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: errMsg,
              confirmButtonColor: '#3085d6',
            });
            console.error('Error deleting category:', err);
          },
        });
      }
    });
  }
}
