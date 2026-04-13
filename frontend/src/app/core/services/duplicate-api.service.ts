import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DuplicateContact } from '../models/duplicate.model';

@Injectable({ providedIn: 'root' })
export class DuplicateApiService {
  private readonly http = inject(HttpClient);

  getDuplicates(contactId: number): Observable<DuplicateContact[]> {
    return this.http.get<DuplicateContact[]>(`/api/contacts/${contactId}/duplicates`);
  }
}
