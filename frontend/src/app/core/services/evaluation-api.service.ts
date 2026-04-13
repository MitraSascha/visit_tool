import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Evaluation, EvaluationCreate } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contacts`;

  getForContact(contactId: number): Observable<Evaluation[]> {
    return this.http.get<Evaluation[]>(`${this.base}/${contactId}/evaluations`);
  }

  create(contactId: number, body: EvaluationCreate): Observable<Evaluation> {
    return this.http.post<Evaluation>(`${this.base}/${contactId}/evaluations`, body);
  }
}
