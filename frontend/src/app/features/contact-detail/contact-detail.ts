import {
  Component, OnInit, ChangeDetectionStrategy, signal, computed, inject,
  ElementRef, ViewChild
} from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CardViewer } from '../../shared/components/card-viewer/card-viewer';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { Timeline } from './timeline/timeline';
import { QrVcard } from '../../shared/components/qr-vcard/qr-vcard';
import { DuplicateDialog } from '../../shared/components/duplicate-dialog/duplicate-dialog';
import {
  PartnerContact, RESPONSE_SPEEDS, WORKED_WITH_OPTIONS, PRIORITIES
} from '../../core/models/contact.model';
import { ContactApiService } from '../../core/services/contact-api.service';
import { AssetApiService } from '../../core/services/asset-api.service';
import { CrmApiService } from '../../core/services/crm-api.service';
import { ReminderApiService } from '../../core/services/reminder-api.service';
import { CrmEvent, CRM_DAY_OPTIONS } from '../../core/models/crm-event.model';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [CardViewer, StarRating, RouterLink, DatePipe, Timeline, QrVcard, DuplicateDialog],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactDetail implements OnInit {
  @ViewChild('actionPanel') actionPanelRef?: ElementRef<HTMLElement>;
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly contactApi  = inject(ContactApiService);
  private readonly crmApi      = inject(CrmApiService);
  private readonly reminderApi = inject(ReminderApiService);
  readonly assetApi             = inject(AssetApiService);

  readonly contact        = signal<PartnerContact | null>(null);
  readonly loading        = signal(true);
  readonly error          = signal<string | null>(null);
  readonly deleteConfirm  = signal(false);
  readonly deleting       = signal(false);
  readonly showQr         = signal(false);
  readonly showDuplicates = signal(false);
  readonly showShare      = signal(false);

  // CRM
  readonly showCrm        = signal(false);
  readonly crmDays        = signal(7);
  readonly crmEvents      = signal<CrmEvent[]>([]);
  readonly crmLoading     = signal(false);
  readonly crmError       = signal<string | null>(null);
  readonly crmSaved       = signal<Set<number>>(new Set());
  readonly crmDayOptions  = CRM_DAY_OPTIONS;

  // Asset-URLs für 3D-Viewer (echte Fotos der Visitenkarte)
  readonly frontImageUrl = computed(() => {
    const asset = this.contact()?.assets?.find(a => a.type === 'front');
    return asset ? this.assetApi.resolveUrl(asset.file_path) : null;
  });

  readonly backImageUrl = computed(() => {
    const asset = this.contact()?.assets?.find(a => a.type === 'back');
    return asset ? this.assetApi.resolveUrl(asset.file_path) : null;
  });

  readonly documents = computed(() =>
    this.contact()?.assets?.filter(a => a.type === 'document') ?? []
  );

  readonly responseSpeedLabel = computed(() => {
    const s = this.contact()?.response_speed;
    return RESPONSE_SPEEDS.find(r => r.value === s)?.label ?? '—';
  });

  readonly workedWithLabel = computed(() => {
    const v = this.contact()?.has_worked_with_us;
    return WORKED_WITH_OPTIONS.find(o => o.value === v)?.label ?? '—';
  });

  readonly priorityLabel = computed(() => {
    const v = this.contact()?.priority;
    return PRIORITIES.find(p => p.value === v)?.label ?? '—';
  });

  shareContact(): void {
    const text = this.shareText();
    if (navigator.share) {
      navigator.share({ title: this.contact()?.company_name ?? '', text }).catch(() => {});
    } else {
      this.showShare.set(true);
      this.scrollToPanel();
    }
  }

  private scrollToPanel(): void {
    // Small delay so Angular renders the panel before we scroll
    setTimeout(() => {
      this.actionPanelRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  openQr(): void {
    this.showQr.update(v => !v);
    if (!this.showQr()) return;
    this.showShare.set(false);
    this.showDuplicates.set(false);
    this.scrollToPanel();
  }

  openDuplicates(): void {
    this.showDuplicates.update(v => !v);
    if (!this.showDuplicates()) return;
    this.showShare.set(false);
    this.showQr.set(false);
    this.scrollToPanel();
  }

  shareText(): string {
    const c = this.contact();
    if (!c) return '';
    return [
      c.company_name,
      c.contact_name,
      c.job_title,
      c.phone   ? `Tel: ${c.phone}`   : '',
      c.mobile  ? `Mobil: ${c.mobile}` : '',
      c.email   ? `E-Mail: ${c.email}` : '',
      c.website ? `Web: ${c.website}`  : '',
      (c.street || c.city) ? [c.street, `${c.zip_code ?? ''} ${c.city ?? ''}`.trim()].filter(Boolean).join(', ') : '',
    ].filter(Boolean).join('\n');
  }

  copyShareText(): void {
    const text = this.shareText();
    // execCommand works without HTTPS; clipboard API requires secure context
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Kontaktdaten kopiert ✓');
  }

  printContact(): void { window.print(); }

  delete(): void {
    const id = this.contact()?.id;
    if (!id) return;
    this.deleting.set(true);
    this.contactApi.delete(id).subscribe({
      next: () => this.router.navigate(['/contacts']),
      error: () => {
        this.deleting.set(false);
        this.deleteConfirm.set(false);
      }
    });
  }

  openCrm(): void {
    this.showCrm.update(v => !v);
    if (!this.showCrm()) return;
    this.showShare.set(false);
    this.showQr.set(false);
    this.showDuplicates.set(false);
    this.loadCrmEvents();
    this.scrollToPanel();
  }

  loadCrmEvents(): void {
    this.crmLoading.set(true);
    this.crmError.set(null);
    this.crmApi.getEvents(this.crmDays()).subscribe({
      next: events => { this.crmEvents.set(events); this.crmLoading.set(false); },
      error: ()     => { this.crmError.set('Termine konnten nicht geladen werden.'); this.crmLoading.set(false); },
    });
  }

  changeCrmDays(days: number): void {
    this.crmDays.set(days);
    this.loadCrmEvents();
  }

  saveAsReminder(event: CrmEvent): void {
    const contact = this.contact();
    if (!contact) return;
    this.reminderApi.create({
      contact_id: contact.id,
      due_date: event.start,
      note: event.title,
      notify_before_minutes: 30,
    }).subscribe(() => {
      this.crmSaved.update(s => new Set([...s, event.id]));
    });
  }

  formatCrmDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error.set('Ungültige ID'); this.loading.set(false); return; }

    this.contactApi.getById(id).subscribe({
      next: c => { this.contact.set(c); this.loading.set(false); },
      error: () => { this.error.set('Kontakt nicht gefunden.'); this.loading.set(false); }
    });
  }
}
