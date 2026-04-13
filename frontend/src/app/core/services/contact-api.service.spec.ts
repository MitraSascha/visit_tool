import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContactApiService, PaginatedContacts } from './contact-api.service';
import { PartnerContact } from '../models/contact.model';
import { environment } from '../../../environments/environment';

const BASE_URL = `${environment.apiUrl}/contacts`;

function mockContact(overrides: Partial<PartnerContact> = {}): PartnerContact {
  return {
    id: 1,
    company_name: 'Test GmbH',
    contact_name: 'Erika Musterfrau',
    job_title: 'Leiterin',
    phone: '030 111111',
    mobile: '',
    email: 'erika@test.de',
    website: '',
    street: 'Teststr. 5',
    zip_code: '10117',
    city: 'Berlin',
    category: 'Elektriker',
    trade: 'Elektro',
    service_description: '',
    service_area: 'Berlin',
    tags: ['zuverlässig'],
    note: '',
    recommended_by: '',
    has_worked_with_us: 'yes',
    internal_rating: 4,
    last_project: '',
    response_speed: 'fast',
    priority: 'high',
    known_by: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockPage(items: PartnerContact[] = []): PaginatedContacts {
  return { items, total: items.length, page: 1, page_size: 200 };
}

describe('ContactApiService', () => {
  let service: ContactApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service  = TestBed.inject(ContactApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── should create ────────────────────────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  // ── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('sends GET without query params when called with empty params', () => {
      service.getAll().subscribe();

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockPage());
    });

    it('appends q param when search query is provided', () => {
      service.getAll({ q: 'Fliesenleger' }).subscribe();

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      expect(req.request.params.get('q')).toBe('Fliesenleger');
      req.flush(mockPage());
    });

    it('appends all provided filter params', () => {
      service.getAll({
        category: 'Elektriker',
        trade: 'Elektro',
        city: 'Berlin',
        has_worked_with_us: 'yes',
        min_rating: 3,
        priority: 'high',
        page: 2,
        page_size: 50,
      }).subscribe();

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      const p = req.request.params;
      expect(p.get('category')).toBe('Elektriker');
      expect(p.get('trade')).toBe('Elektro');
      expect(p.get('city')).toBe('Berlin');
      expect(p.get('has_worked_with_us')).toBe('yes');
      expect(p.get('min_rating')).toBe('3');
      expect(p.get('priority')).toBe('high');
      expect(p.get('page')).toBe('2');
      expect(p.get('page_size')).toBe('50');
      req.flush(mockPage());
    });

    it('does NOT append params for undefined/falsy values', () => {
      service.getAll({ q: '', category: undefined }).subscribe();

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      expect(req.request.params.has('q')).toBeFalse();
      expect(req.request.params.has('category')).toBeFalse();
      req.flush(mockPage());
    });

    it('returns paginated response', () => {
      const contacts = [mockContact({ id: 1 }), mockContact({ id: 2 })];
      let result: PaginatedContacts | undefined;

      service.getAll().subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      req.flush(mockPage(contacts));

      expect(result?.items.length).toBe(2);
      expect(result?.total).toBe(2);
    });

    it('propagates HTTP error', () => {
      let errorCaught = false;
      service.getAll().subscribe({ error: () => (errorCaught = true) });

      const req = httpMock.expectOne(r => r.url === BASE_URL);
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
      expect(errorCaught).toBeTrue();
    });
  });

  // ── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('sends GET to correct URL', () => {
      let result: PartnerContact | undefined;

      service.getById(42).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${BASE_URL}/42`);
      expect(req.request.method).toBe('GET');
      req.flush(mockContact({ id: 42 }));
      expect(result?.id).toBe(42);
    });

    it('propagates 404 error', () => {
      let errorCaught = false;
      service.getById(999).subscribe({ error: () => (errorCaught = true) });

      const req = httpMock.expectOne(`${BASE_URL}/999`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      expect(errorCaught).toBeTrue();
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('sends POST with contact payload and returns created contact', () => {
      const payload: Partial<PartnerContact> = { company_name: 'Neu GmbH' };
      let result: PartnerContact | undefined;

      service.create(payload).subscribe(r => (result = r));

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockContact({ id: 99, company_name: 'Neu GmbH' }));
      expect(result?.id).toBe(99);
    });

    it('propagates validation error (422)', () => {
      let errorCaught = false;
      service.create({}).subscribe({ error: () => (errorCaught = true) });

      const req = httpMock.expectOne(BASE_URL);
      req.flush('Unprocessable', { status: 422, statusText: 'Unprocessable Entity' });
      expect(errorCaught).toBeTrue();
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('sends PUT to correct URL with updated payload', () => {
      const patch: Partial<PartnerContact> = { city: 'Hamburg' };
      let result: PartnerContact | undefined;

      service.update(5, patch).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${BASE_URL}/5`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(patch);
      req.flush(mockContact({ id: 5, city: 'Hamburg' }));
      expect(result?.city).toBe('Hamburg');
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('sends DELETE to correct URL', () => {
      let completed = false;

      service.delete(7).subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${BASE_URL}/7`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completed).toBeTrue();
    });

    it('propagates 403 error', () => {
      let errorCaught = false;
      service.delete(7).subscribe({ error: () => (errorCaught = true) });

      const req = httpMock.expectOne(`${BASE_URL}/7`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      expect(errorCaught).toBeTrue();
    });
  });
});
