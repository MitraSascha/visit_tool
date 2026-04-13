import { Component, Input, OnChanges, ElementRef, ViewChild, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartnerContact } from '../../../core/models/contact.model';

@Component({
  selector: 'app-qr-vcard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-vcard.html',
  styleUrl: './qr-vcard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrVcard implements OnChanges {
  @Input() contact!: PartnerContact;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly qrGenerated = signal(false);

  async ngOnChanges(): Promise<void> {
    if (!this.contact) return;
    // Kleines Timeout damit ViewChild verfügbar ist
    setTimeout(() => this.generateQr(), 50);
  }

  private buildVcard(): string {
    const c = this.contact;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.contact_name || c.company_name}`,
      `ORG:${c.company_name}`,
      c.job_title ? `TITLE:${c.job_title}` : '',
      c.phone ? `TEL;TYPE=WORK,VOICE:${c.phone}` : '',
      c.mobile ? `TEL;TYPE=CELL:${c.mobile}` : '',
      c.email ? `EMAIL:${c.email}` : '',
      c.website ? `URL:${c.website.startsWith('http') ? c.website : 'https://' + c.website}` : '',
      (c.street || c.city) ? `ADR;TYPE=WORK:;;${c.street || ''};${c.city || ''};${c.zip_code || ''};;;` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\n');
  }

  private async generateQr(): Promise<void> {
    if (!this.canvasRef) return;
    try {
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(this.canvasRef.nativeElement, this.buildVcard(), {
        width: 200,
        color: { dark: '#4ade80', light: '#0f1613' },
        errorCorrectionLevel: 'M',
      });
      this.qrGenerated.set(true);
    } catch (e) {
      console.error('QR generation failed', e);
    }
  }

  downloadVcard(): void {
    const vcard = this.buildVcard();
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.contact.company_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
