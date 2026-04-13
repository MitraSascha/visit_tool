import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContactsList } from './contacts-list';
import { ContactApiService, PaginatedContacts } from '../../../core/services/contact-api.service';
import { PartnerContact } from '../../../core/models/contact.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContact(overrides: Partial<PartnerContact> = {}): PartnerContact {
  return {
    id: 1,
    company_name: 'Muster GmbH',
    contact_name: 'Max',
    job_title:    '',
    phone: '', mobile: '', email: '', website: '',
    street: '', zip_code: '',
    city: 'Berlin',
    category: 'Elektriker',
    trade: 'Elektro',
    service_description: 'Elektroinstallation',
    service_area: 'Berlin',
    tags: ['schnell'],
    note: '', recommended_by: '',
    has_worked_with_us: 'yes',
    internal_rating: 4,
    last_project: '', response_speed: null, priority: 'high', known_by: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockPage(items: PartnerContact[]): PaginatedContacts {
  return { items, total: items.length, page: 1, page_size: 200 };
}

// ── Spec ─────────────────────────────────────────────────────────────────────

describe('ContactsList', () => {
  let fixture:   ComponentFixture<ContactsList>;
  let component: ContactsList;
  let apiSpy:    jasmine.SpyObj<ContactApiService>;

  const CONTACTS: PartnerContact[] = [
    makeContact({ id: 1, company_name: 'Elektriker Berlin',  city: 'Berlin',  category: 'Elektriker', has_worked_with_us: 'yes'     }),
    makeContact({ id: 2, company_name: 'Fliesenleger Hamburg', city: 'Hamburg', category: 'Fliesenleger', has_worked_with_us: 'no' }),
    makeContact({ id: 3, company_name: 'Maler München',      city: 'München', category: 'Maler',       has_worked_with_us: 'not_yet' }),
  ];

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ContactApiService', ['getAll']);
    apiSpy.getAll.and.returnValue(of(mockPage(CONTACTS)));

    await TestBed.configureTestingModule({
      imports: [ContactsList],
      providers: [
        provideRouter([]),
        { provide: ContactApiService, useValue: apiSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ContactsList);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → load()
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  // ── should create ─────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial load ──────────────────────────────────────────────────────────

  it('calls getAll with page_size 200 on init', () => {
    expect(apiSpy.getAll).toHaveBeenCalledWith({ page_size: 200 });
  });

  it('populates allContacts after successful load', () => {
    expect(component.allContacts().length).toBe(3);
  });

  it('sets loading to false after successful load', () => {
    expect(component.loading()).toBeFalse();
  });

  it('sets loading to false on error', fakeAsync(() => {
    apiSpy.getAll.and.returnValue(throwError(() => new Error('Network error')));
    component['load'](); // call private load() again to simulate error
    tick();
    expect(component.loading()).toBeFalse();
  }));

  // ── filteredContacts (client-side filtering) ──────────────────────────────

  describe('filteredContacts', () => {
    it('returns all contacts when no filter is active', () => {
      expect(component.filteredContacts().length).toBe(3);
    });

    it('filters by search query (matches company_name)', () => {
      component.searchQuery.set('elektriker');
      expect(component.filteredContacts().length).toBe(1);
      expect(component.filteredContacts()[0].company_name).toBe('Elektriker Berlin');
    });

    it('filters by search query (matches city)', () => {
      component.searchQuery.set('hamburg');
      expect(component.filteredContacts().length).toBe(1);
    });

    it('filters by search query (matches tags)', () => {
      // CONTACTS all have tag 'schnell'
      component.searchQuery.set('schnell');
      expect(component.filteredContacts().length).toBe(3);
    });

    it('filters by category', () => {
      component.filterCategory.set('Maler');
      expect(component.filteredContacts().length).toBe(1);
      expect(component.filteredContacts()[0].company_name).toBe('Maler München');
    });

    it('filters by city (partial, case-insensitive)', () => {
      component.filterCity.set('mün');
      expect(component.filteredContacts().length).toBe(1);
    });

    it('filters by has_worked_with_us', () => {
      component.filterWorked.set('yes');
      expect(component.filteredContacts().length).toBe(1);
      expect(component.filteredContacts()[0].has_worked_with_us).toBe('yes');
    });

    it('combines multiple filters (AND logic)', () => {
      component.filterCategory.set('Elektriker');
      component.filterWorked.set('yes');
      expect(component.filteredContacts().length).toBe(1);
    });

    it('returns empty array when no contact matches combined filters', () => {
      component.filterCategory.set('Elektriker');
      component.filterWorked.set('no');
      expect(component.filteredContacts().length).toBe(0);
    });
  });

  // ── hasFilters ────────────────────────────────────────────────────────────

  describe('hasFilters', () => {
    it('is false when no filter is set', () => {
      expect(component.hasFilters()).toBeFalse();
    });

    it('is true when searchQuery is set', () => {
      component.searchQuery.set('test');
      expect(component.hasFilters()).toBeTrue();
    });

    it('is true when category filter is set', () => {
      component.filterCategory.set('Maler');
      expect(component.hasFilters()).toBeTrue();
    });
  });

  // ── clearFilters ──────────────────────────────────────────────────────────

  describe('clearFilters', () => {
    it('resets all filter signals', () => {
      component.searchQuery.set('test');
      component.filterCategory.set('Maler');
      component.filterCity.set('Berlin');
      component.filterWorked.set('yes');

      component.clearFilters();

      expect(component.searchQuery()).toBe('');
      expect(component.filterCategory()).toBe('');
      expect(component.filterCity()).toBe('');
      expect(component.filterWorked()).toBe('');
      expect(component.hasFilters()).toBeFalse();
    });
  });

  // ── ratingStars ───────────────────────────────────────────────────────────

  describe('ratingStars', () => {
    it('returns em dash for null rating', () => {
      expect(component.ratingStars(null)).toBe('—');
    });

    it('returns correct star string for rating 3', () => {
      expect(component.ratingStars(3)).toBe('★★★☆☆');
    });

    it('returns 5 filled stars for rating 5', () => {
      expect(component.ratingStars(5)).toBe('★★★★★');
    });

    it('returns 1 filled star for rating 1', () => {
      expect(component.ratingStars(1)).toBe('★☆☆☆☆');
    });
  });
});
