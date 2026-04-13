import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface OcrResult {
  company_name:        string | null;
  contact_name:        string | null;
  job_title:           string | null;
  phone:               string | null;
  mobile:              string | null;
  email:               string | null;
  website:             string | null;
  street:              string | null;
  zip_code:            string | null;
  city:                string | null;
  category:            string | null;
  trade:               string | null;
  service_description: string | null;
  service_area:        string | null;
  tags:                string | null;
  raw_text:            string;
}

@Injectable({ providedIn: 'root' })
export class OcrApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ocr`;

  /** Schickt Vorder- und optional Rückseite gemeinsam an Ollama */
  extractFromBlob(front: Blob, back?: Blob | null) {
    const form = new FormData();
    form.append('file', front, 'front.jpg');
    if (back) form.append('back', back, 'back.jpg');
    return this.http.post<OcrResult>(`${this.base}/extract`, form);
  }

  /** Alternative: Base64-String schicken */
  extractFromBase64(base64: string) {
    return this.http.post<OcrResult>(`${this.base}/extract-base64`, {
      image_base64: base64
    });
  }
}
