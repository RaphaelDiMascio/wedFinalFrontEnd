import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/categories`;

  private readonly defaultCategories = [
    'Alimentation',
    'Logement',
    'Loisirs',
    'Transport',
    'Santé',
    'Factures & Services',
    'Salaire',
    'Épargne & Investissement',
    'Cadeaux & Dons',
    'Autre'
  ];

  constructor(private http: HttpClient) {}

  getCategories(name?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (name) {
      params = params.set('name', name);
    }
    return this.http.get<Category[]>(this.apiUrl, { params }).pipe(
      switchMap(categories => {
        if (categories.length === 0 && !name) {
          // No categories exist on the backend yet, auto-seed defaults!
          return this.seedDefaultCategories().pipe(
            switchMap(() => this.http.get<Category[]>(this.apiUrl))
          );
        }
        return of(categories);
      }),
      catchError(() => of([]))
    );
  }

  createCategory(categoryName: string): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, { name: categoryName });
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private seedDefaultCategories(): Observable<Category[]> {
    const seedRequests = this.defaultCategories.map(name => 
      this.http.post<Category>(this.apiUrl, { name }).pipe(
        catchError(err => {
          console.warn(`Category "${name}" seed error:`, err);
          return of(null);
        })
      )
    );
    return forkJoin(seedRequests).pipe(
      map(results => results.filter((c): c is Category => c !== null))
    );
  }
}
