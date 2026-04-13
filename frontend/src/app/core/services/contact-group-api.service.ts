import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactGroup, ContactGroupCreate } from '../models/contact-group.model';

@Injectable({ providedIn: 'root' })
export class ContactGroupApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/groups`;

  getAll(): Observable<ContactGroup[]> {
    return this.http.get<ContactGroup[]>(this.base);
  }

  create(body: ContactGroupCreate): Observable<ContactGroup> {
    return this.http.post<ContactGroup>(this.base, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addMember(groupId: number, contactId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${groupId}/members`, { contact_id: contactId });
  }

  removeMember(groupId: number, contactId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${groupId}/members/${contactId}`);
  }
}
