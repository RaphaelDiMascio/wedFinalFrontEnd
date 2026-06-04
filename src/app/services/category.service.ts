import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category } from '../models/category.model';
import { AuthService } from './auth.service';

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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getCategories(name?: string): Observable<Category[]> {
    const user = this.authService.currentUser();
    let params = new HttpParams();
    if (user && user.id) {
      params = params.set('userId', user.id);
    }
    if (name) {
      params = params.set('name', name);
    }
    return this.http.get<Category[]>(this.apiUrl, { params }).pipe(
      switchMap(categories => {
        if (categories.length === 0 && !name) {
          // No categories exist on the backend yet, auto-seed defaults!
          return this.seedDefaultCategories().pipe(
            switchMap(() => {
              let seedParams = new HttpParams();
              if (user && user.id) {
                seedParams = seedParams.set('userId', user.id);
              }
              return this.http.get<Category[]>(this.apiUrl, { params: seedParams });
            })
          );
        }
        return of(categories);
      }),
      catchError(() => of([]))
    );
  }

  createCategory(categoryName: string): Observable<Category> {
    const user = this.authService.currentUser();
    let params = new HttpParams();
    if (user && user.id) {
      params = params.set('userId', user.id);
    }
    return this.http.post<Category>(this.apiUrl, { name: categoryName }, { params });
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateCategory(id: string, newName: string): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, { name: newName });
  }


  private seedDefaultCategories(): Observable<Category[]> {
    const seedRequests = this.defaultCategories.map(name => 
      this.createCategory(name).pipe(
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
