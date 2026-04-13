import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrmEvent } from '../models/crm-event.model';

@Injectable({ providedIn: 'root' })
export class CrmApiService {
  private readonly http = inject(HttpClient);

  getEvents(days: number): Observable<CrmEvent[]> {
    const params = new HttpParams().set('days', days);
    return this.http.get<CrmEvent[]>(`${environment.apiUrl}/crm/events`, { params });
  }
}
