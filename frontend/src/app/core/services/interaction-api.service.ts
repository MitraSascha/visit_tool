import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Interaction, InteractionCreate } from '../models/interaction.model';

@Injectable({ providedIn: 'root' })
export class InteractionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getAll(contactId: number): Observable<Interaction[]> {
    return this.http.get<Interaction[]>(`${this.base}/contacts/${contactId}/interactions`);
  }

  create(contactId: number, body: InteractionCreate): Observable<Interaction> {
    return this.http.post<Interaction>(`${this.base}/contacts/${contactId}/interactions`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/interactions/${id}`);
  }
}
