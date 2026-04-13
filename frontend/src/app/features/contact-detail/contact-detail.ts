import {
  Component, OnInit, ChangeDetectionStrategy, signal, computed, inject
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

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [CardViewer, StarRating, RouterLink, DatePipe, Timeline, QrVcard, DuplicateDialog],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactDetail implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly contactApi = inject(ContactApiService);
  readonly assetApi            = inject(AssetApiService);

  readonly contact        = signal<PartnerContact | null>(null);
  readonly loading        = signal(true);
  readonly error          = signal<string | null>(null);
  readonly deleteConfirm  = signal(false);
  readonly deleting       = signal(false);
  readonly showQr         = signal(false);
  readonly showDuplicates = signal(false);

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
    const c = this.contact();
    if (!c || !('share' in navigator)) return;
    const confirmed = confirm('Sie teilen personenbezogene Daten. Fortfahren?');
    if (!confirmed) return;
    navigator.share({
      title: c.company_name,
      text: [c.contact_name, c.phone || c.mobile, c.email].filter(Boolean).join(' · '),
    }).catch(() => {});
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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error.set('Ungültige ID'); this.loading.set(false); return; }

    this.contactApi.getById(id).subscribe({
      next: c => { this.contact.set(c); this.loading.set(false); },
      error: () => { this.error.set('Kontakt nicht gefunden.'); this.loading.set(false); }
    });
  }
}
