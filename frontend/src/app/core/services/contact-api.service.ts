import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { from } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PartnerContact, ContactSearchParams
} from '../models/contact.model';
import { OfflineContactStore } from './offline-store.service';

export interface PaginatedContacts {
  items: PartnerContact[];
  total: number;
  page: number;
  page_size: number;
}

@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contacts`;
  private readonly offlineStore = inject(OfflineContactStore);

  getAll(params: ContactSearchParams = {}): Observable<PaginatedContacts> {
    let httpParams = new HttpParams();
    if (params.q)                httpParams = httpParams.set('q',                params.q);
    if (params.category)         httpParams = httpParams.set('category',         params.category);
    if (params.trade)            httpParams = httpParams.set('trade',            params.trade);
    if (params.city)             httpParams = httpParams.set('city',             params.city);
    if (params.has_worked_with_us) httpParams = httpParams.set('has_worked_with_us', params.has_worked_with_us);
    if (params.min_rating)       httpParams = httpParams.set('min_rating',       params.min_rating);
    if (params.priority)         httpParams = httpParams.set('priority',         params.priority);
    if (params.page)             httpParams = httpParams.set('page',             params.page);
    if (params.page_size)        httpParams = httpParams.set('page_size',        params.page_size);

    return this.http.get<PaginatedContacts>(this.base, { params: httpParams }).pipe(
      tap(result => this.offlineStore.syncFromApi(result.items).catch(console.error)),
      catchError(() =>
        from(this.offlineStore.getAll()).pipe(
          map(items => ({ items, total: items.length, page: 1, page_size: items.length }))
        )
      )
    );
  }

  getById(id: number) {
    return this.http.get<PartnerContact>(`${this.base}/${id}`);
  }

  create(contact: Partial<PartnerContact>) {
    return this.http.post<PartnerContact>(this.base, contact);
  }

  update(id: number, contact: Partial<PartnerContact>) {
    return this.http.put<PartnerContact>(`${this.base}/${id}`, contact);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
