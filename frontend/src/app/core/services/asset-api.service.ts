import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PartnerCardAsset, AssetType } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/contacts`;

  upload(contactId: number, blob: Blob, type: AssetType, filename: string) {
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('asset_type', type);
    return this.http.post<PartnerCardAsset>(
      `${this.base}/${contactId}/assets`, form
    );
  }

  getAll(contactId: number) {
    return this.http.get<PartnerCardAsset[]>(`${this.base}/${contactId}/assets`);
  }

  delete(assetId: number) {
    return this.http.delete<void>(`${environment.apiUrl}/assets/${assetId}`);
  }

  /** Baut die vollständige URL für ein Asset auf */
  resolveUrl(filePath: string): string {
    if (filePath.startsWith('/app/')) return filePath.replace('/app/', '/');
    if (filePath.startsWith('/uploads/')) return filePath;
    return `/uploads/${filePath}`;
  }
}
