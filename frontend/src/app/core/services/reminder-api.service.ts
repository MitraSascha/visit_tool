import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reminder, ReminderCreate, ReminderUpdate } from '../models/reminder.model';

@Injectable({ providedIn: 'root' })
export class ReminderApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reminders`;

  getAll(overdue?: boolean): Observable<Reminder[]> {
    let params = new HttpParams();
    if (overdue === true) {
      params = params.set('overdue', 'true');
    }
    return this.http.get<Reminder[]>(this.base, { params });
  }

  create(body: ReminderCreate): Observable<Reminder> {
    return this.http.post<Reminder>(this.base, body);
  }

  update(id: number, body: ReminderUpdate): Observable<Reminder> {
    return this.http.put<Reminder>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
