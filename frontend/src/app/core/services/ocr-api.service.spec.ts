import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OcrApiService, OcrResult } from './ocr-api.service';
import { environment } from '../../../environments/environment';

const MOCK_OCR_RESULT: OcrResult = {
  company_name:        'Muster GmbH',
  contact_name:        'Max Mustermann',
  job_title:           'Geschäftsführer',
  phone:               '+49 30 12345678',
  mobile:              '+49 170 9876543',
  email:               'max@muster.de',
  website:             'www.muster.de',
  street:              'Musterstraße 1',
  zip_code:            '12345',
  city:                'Berlin',
  category:            'Elektriker',
  trade:               'Elektroinstallation',
  service_description: 'Elektroarbeiten aller Art',
  service_area:        'Berlin, Brandenburg',
  tags:                'Elektriker, zuverlässig',
  raw_text:            'Muster GmbH\nMax Mustermann\n...',
};

describe('OcrApiService', () => {
  let service: OcrApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service  = TestBed.inject(OcrApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── should create ────────────────────────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  // ── extractFromBlob ──────────────────────────────────────────────────────

  describe('extractFromBlob', () => {
    it('sends front blob as multipart/form-data and returns OcrResult', () => {
      const frontBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      let result: OcrResult | undefined;

      service.extractFromBlob(frontBlob).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.has('file')).toBeTrue();
      expect(req.request.body.has('back')).toBeFalse();

      req.flush(MOCK_OCR_RESULT);
      expect(result).toEqual(MOCK_OCR_RESULT);
    });

    it('sends both front and back blobs when back is provided', () => {
      const frontBlob = new Blob(['front'], { type: 'image/jpeg' });
      const backBlob  = new Blob(['back'],  { type: 'image/jpeg' });

      service.extractFromBlob(frontBlob, backBlob).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract`);
      expect(req.request.body.has('file')).toBeTrue();
      expect(req.request.body.has('back')).toBeTrue();
      req.flush(MOCK_OCR_RESULT);
    });

    it('does NOT append back when back is null', () => {
      const frontBlob = new Blob(['front'], { type: 'image/jpeg' });

      service.extractFromBlob(frontBlob, null).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract`);
      expect(req.request.body.has('back')).toBeFalse();
      req.flush(MOCK_OCR_RESULT);
    });

    it('propagates HTTP error to subscriber', () => {
      const frontBlob = new Blob(['front'], { type: 'image/jpeg' });
      let errorCaught = false;

      service.extractFromBlob(frontBlob).subscribe({
        next: () => fail('should have errored'),
        error: () => (errorCaught = true),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract`);
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
      expect(errorCaught).toBeTrue();
    });
  });

  // ── extractFromBase64 ────────────────────────────────────────────────────

  describe('extractFromBase64', () => {
    const BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

    it('posts base64 string as JSON body and returns OcrResult', () => {
      let result: OcrResult | undefined;

      service.extractFromBase64(BASE64).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract-base64`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ image_base64: BASE64 });

      req.flush(MOCK_OCR_RESULT);
      expect(result).toEqual(MOCK_OCR_RESULT);
    });

    it('propagates 400 error to subscriber', () => {
      let errorCaught = false;

      service.extractFromBase64('invalid-base64').subscribe({
        next: () => fail('should have errored'),
        error: () => (errorCaught = true),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/ocr/extract-base64`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      expect(errorCaught).toBeTrue();
    });
  });
});
