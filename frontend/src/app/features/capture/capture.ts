import {
  Component, ChangeDetectionStrategy,
  signal, computed, inject, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardViewer } from '../../shared/components/card-viewer/card-viewer';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { OcrApiService, OcrResult } from '../../core/services/ocr-api.service';
import { ContactApiService } from '../../core/services/contact-api.service';
import { AssetApiService } from '../../core/services/asset-api.service';
import { WorkedWith, Priority, ResponseSpeed, CATEGORIES, RESPONSE_SPEEDS, PRIORITIES, WORKED_WITH_OPTIONS } from '../../core/models/contact.model';

type Step = 'front' | 'back' | 'ocr' | 'form';

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [CardViewer, StarRating, ReactiveFormsModule],
  templateUrl: './capture.html',
  styleUrl: './capture.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Capture implements OnDestroy {
  // Versteckte File-Inputs für nativen Kamerazugriff
  @ViewChild('frontInput') frontInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('backInput')  backInputRef!:  ElementRef<HTMLInputElement>;

  private readonly ocr        = inject(OcrApiService);
  private readonly contactApi = inject(ContactApiService);
  private readonly assetApi   = inject(AssetApiService);
  private readonly router     = inject(Router);
  private readonly fb         = inject(FormBuilder);

  readonly step         = signal<Step>('front');
  readonly ocrRunning   = signal(false);
  readonly saving       = signal(false);
  readonly saveError    = signal<string | null>(null);
  readonly ocrWarning   = signal(false);

  readonly frontBlob       = signal<Blob | null>(null);
  readonly backBlob        = signal<Blob | null>(null);
  readonly frontPreviewUrl = signal<string | null>(null);
  readonly backPreviewUrl  = signal<string | null>(null);

  readonly stepLabel = computed(() => ({
    front: 'Schritt 1 / 3 — Vorderseite',
    back:  'Schritt 2 / 3 — Rückseite',
    ocr:   'Texte werden erkannt…',
    form:  'Schritt 3 / 3 — Daten prüfen & speichern',
  }[this.step()]));

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

  // ── Foto aufnehmen / auswählen ───────────────────────────────────────────

  openGallery(side: 'front' | 'back'): void {
    const input = side === 'front'
      ? this.frontInputRef.nativeElement
      : this.backInputRef.nativeElement;
    input.click();
  }

  onFrontSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.setImage('front', file);
    // Vorläufige OCR starten — wird bei Rückseite durch kombinierten Call ersetzt
    this.runOcr(file, null);
  }

  onBackSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.setImage('back', file);
  }

  private setImage(side: 'front' | 'back', file: File): void {
    const url = URL.createObjectURL(file);
    if (side === 'front') {
      if (this.frontPreviewUrl()) URL.revokeObjectURL(this.frontPreviewUrl()!);
      this.frontBlob.set(file);
      this.frontPreviewUrl.set(url);
    } else {
      if (this.backPreviewUrl()) URL.revokeObjectURL(this.backPreviewUrl()!);
      this.backBlob.set(file);
      this.backPreviewUrl.set(url);
    }
    // Input zurücksetzen damit dasselbe Bild nochmal gewählt werden kann
    const input = side === 'front'
      ? this.frontInputRef.nativeElement
      : this.backInputRef.nativeElement;
    input.value = '';
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  confirmFront(): void {
    this.step.set('back');
  }

  confirmBack(): void {
    const front = this.frontBlob();
    const back  = this.backBlob();
    if (front && back) {
      // Beide Seiten vorhanden → kombinierten OCR-Call starten (bessere Qualität)
      this.runOcr(front, back);
    }
    if (this.ocrRunning()) {
      this.step.set('ocr');
    } else {
      this.step.set('form');
    }
  }

  skipBack(): void {
    if (this.ocrRunning()) {
      this.step.set('ocr');
    } else {
      this.step.set('form');
    }
  }

  retake(side: 'front' | 'back'): void {
    this.step.set(side);
  }

  // ── OCR ──────────────────────────────────────────────────────────────────

  private ocrRequestId = 0;

  private runOcr(front: Blob, back: Blob | null): void {
    const id = ++this.ocrRequestId;
    this.ocrRunning.set(true);
    this.ocrWarning.set(false);
    this.ocr.extractFromBlob(front, back).subscribe({
      next: result => {
        if (id !== this.ocrRequestId) return; // veraltetes Ergebnis ignorieren
        this.ocrRunning.set(false);
        this.prefillForm(result);
        if (this.step() === 'ocr') this.step.set('form');
      },
      error: () => {
        if (id !== this.ocrRequestId) return;
        this.ocrRunning.set(false);
        this.ocrWarning.set(true);
        if (this.step() === 'ocr') this.step.set('form');
      }
    });
  }

  private prefillForm(ocr: OcrResult): void {
    this.form.patchValue({
      company_name:        ocr.company_name        ?? '',
      contact_name:        ocr.contact_name        ?? '',
      job_title:           ocr.job_title           ?? '',
      phone:               ocr.phone               ?? '',
      mobile:              ocr.mobile              ?? '',
      email:               ocr.email               ?? '',
      website:             ocr.website             ?? '',
      street:              ocr.street              ?? '',
      zip_code:            ocr.zip_code            ?? '',
      city:                ocr.city                ?? '',
      category:            ocr.category            ?? '',
      trade:               ocr.trade               ?? '',
      service_description: ocr.service_description ?? '',
      service_area:        ocr.service_area        ?? '',
      tags:                ocr.tags                ?? '',
    });
  }

  setRating(val: number): void {
    this.form.controls.internal_rating.setValue(val);
  }

  // ── Speichern ────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const raw = this.form.getRawValue();
    const contactData = {
      ...raw,
      tags: raw.tags
        ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
      internal_rating:    raw.internal_rating || null,
      response_speed:     (raw.response_speed as ResponseSpeed) || null,
      has_worked_with_us: raw.has_worked_with_us as WorkedWith,
      priority:           raw.priority as Priority,
    };

    try {
      const contact = await this.contactApi.create(contactData).toPromise();
      if (!contact) throw new Error('Kein Kontakt zurückgegeben');

      const uploads: Promise<unknown>[] = [];
      if (this.frontBlob())
        uploads.push(this.assetApi.upload(contact.id, this.frontBlob()!, 'front', 'front.jpg').toPromise());
      if (this.backBlob())
        uploads.push(this.assetApi.upload(contact.id, this.backBlob()!, 'back', 'back.jpg').toPromise());
      await Promise.all(uploads);

      this.router.navigate(['/contacts', contact.id]);
    } catch {
      this.saving.set(false);
      this.saveError.set('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    }
  }

  ngOnDestroy(): void {
    if (this.frontPreviewUrl()) URL.revokeObjectURL(this.frontPreviewUrl()!);
    if (this.backPreviewUrl())  URL.revokeObjectURL(this.backPreviewUrl()!);
  }
}
