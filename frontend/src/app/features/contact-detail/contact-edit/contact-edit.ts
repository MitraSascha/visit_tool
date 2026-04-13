import {
  Component, OnInit, ChangeDetectionStrategy, signal, inject
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { ContactApiService } from '../../../core/services/contact-api.service';
import {
  PartnerContact, WorkedWith, Priority, ResponseSpeed,
  CATEGORIES, RESPONSE_SPEEDS, PRIORITIES, WORKED_WITH_OPTIONS
} from '../../../core/models/contact.model';

@Component({
  selector: 'app-contact-edit',
  standalone: true,
  imports: [ReactiveFormsModule, StarRating],
  templateUrl: './contact-edit.html',
  styleUrl: './contact-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactEdit implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly contactApi = inject(ContactApiService);
  private readonly fb         = inject(FormBuilder);

  readonly isNew    = signal(false);
  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly contactId = signal<number | null>(null);

  readonly categories     = CATEGORIES;
  readonly responseSpeeds = RESPONSE_SPEEDS;
  readonly priorities     = PRIORITIES;
  readonly workedOptions  = WORKED_WITH_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    company_name:        ['', Validators.required],
    contact_name:        [''],
    job_title:           [''],
    phone:               [''],
    mobile:              [''],
    email:               [''],
    website:             [''],
    street:              [''],
    zip_code:            [''],
    city:                [''],
    category:            [''],
    trade:               [''],
    service_description: [''],
    service_area:        [''],
    tags:                [''],
    note:                [''],
    recommended_by:      [''],
    has_worked_with_us:  ['not_yet'],
    internal_rating:     [0],
    last_project:        [''],
    response_speed:      [''],
    priority:            ['medium'],
    known_by:            [''],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.isNew.set(true);
      return;
    }

    const id = Number(idParam);
    this.contactId.set(id);
    this.loading.set(true);

    this.contactApi.getById(id).subscribe({
      next: c => {
        this.loading.set(false);
        this.form.patchValue({
          ...c,
          tags: c.tags?.join(', ') ?? '',
          internal_rating: c.internal_rating ?? 0,
          response_speed:  c.response_speed  ?? '',
          priority:        c.priority        ?? 'medium',
        });
      },
      error: () => this.loading.set(false)
    });
  }

  setRating(val: number): void {
    this.form.controls.internal_rating.setValue(val);
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const data: Partial<PartnerContact> = {
      ...raw,
      tags: raw.tags
        ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
      internal_rating:    raw.internal_rating || null,
      response_speed:     (raw.response_speed as ResponseSpeed) || null,
      has_worked_with_us: raw.has_worked_with_us as WorkedWith,
      priority:           raw.priority as Priority,
    };

    const id = this.contactId();
    const req = id
      ? this.contactApi.update(id, data)
      : this.contactApi.create(data);

    req.subscribe({
      next: c => this.router.navigate(['/contacts', c.id]),
      error: () => this.saving.set(false)
    });
  }

  cancel(): void {
    const id = this.contactId();
    if (id) this.router.navigate(['/contacts', id]);
    else this.router.navigate(['/contacts']);
  }
}
