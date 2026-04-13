import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GeoContact } from '../models/geo.model';

@Injectable({ providedIn: 'root' })
export class GeoApiService {
  private readonly http = inject(HttpClient);

  getGeoContacts(): Observable<GeoContact[]> {
    return this.http.get<GeoContact[]>('/api/contacts/geo/all');
  }

  geocodeContact(contactId: number): Observable<GeoContact> {
    return this.http.post<GeoContact>(`/api/contacts/${contactId}/geocode`, {});
  }
}
