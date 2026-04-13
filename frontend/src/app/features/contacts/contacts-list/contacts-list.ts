import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  signal, computed, inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap } from 'rxjs';
import { ContactApiService } from '../../../core/services/contact-api.service';
import { PartnerContact, CATEGORIES } from '../../../core/models/contact.model';

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [RouterLink, FormsModule, ScrollingModule],
  templateUrl: './contacts-list.html',
  styleUrl: './contacts-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactsList implements OnInit, OnDestroy {
  private readonly api     = inject(ContactApiService);
  private readonly destroy = new Subject<void>();

  readonly categories = CATEGORIES;

  readonly allContacts    = signal<PartnerContact[]>([]);
  readonly loading        = signal(false);
  readonly searchQuery    = signal('');
  readonly filterCategory = signal('');
  readonly filterCity     = signal('');
  readonly filterWorked   = signal('');

  // Client-seitige Filterung (schnell, kein API-Roundtrip bei Tippen)
  readonly filteredContacts = computed(() => {
    const q        = this.searchQuery().toLowerCase().trim();
    const category = this.filterCategory();
    const city     = this.filterCity().toLowerCase().trim();
    const worked   = this.filterWorked();

    return this.allContacts().filter(c => {
      if (q && ![c.company_name, c.contact_name, c.service_description,
                 c.trade, c.city, ...(c.tags ?? [])]
               .some(f => f?.toLowerCase().includes(q))) return false;
      if (category && c.category !== category)           return false;
      if (city && !c.city?.toLowerCase().includes(city)) return false;
      if (worked && c.has_worked_with_us !== worked)     return false;
      return true;
    });
  });

  readonly hasFilters = computed(() =>
    !!this.searchQuery() || !!this.filterCategory() ||
    !!this.filterCity()  || !!this.filterWorked()
  );

  // Suche mit Debounce → API-Call bei längeren Pausen
  private readonly searchTrigger = new Subject<void>();

  ngOnInit(): void {
    this.load();

    // Bei Änderung der Dropdowns: sofort neu laden
    // (Suche per computed() clientseitig — kein Extra-Call nötig)
  }

  private load(): void {
    this.loading.set(true);
    this.api.getAll({ page_size: 200 })
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: res => {
          this.allContacts.set(res.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterCategory.set('');
    this.filterCity.set('');
    this.filterWorked.set('');
  }

  ratingStars(rating: number | null): string {
    if (!rating) return '—';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }
}
