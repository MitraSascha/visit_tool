import { Component, OnInit, signal, ChangeDetectionStrategy, inject, WritableSignal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EvaluationApiService } from '../../../core/services/evaluation-api.service';

@Component({
  selector: 'app-evaluation-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './evaluation-form.html',
  styleUrl: './evaluation-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly evaluationApi = inject(EvaluationApiService);

  readonly contactId = signal<number>(0);
  readonly quality = signal(3);
  readonly punctuality = signal(3);
  readonly communication = signal(3);
  readonly pricePerfRatio = signal(3);
  readonly reliability = signal(3);
  readonly note = signal('');
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);

  readonly criteria = [
    { key: 'quality',       label: 'Qualität' },
    { key: 'punctuality',   label: 'Pünktlichkeit' },
    { key: 'communication', label: 'Kommunikation' },
    { key: 'price_perf',    label: 'Preis-Leistung' },
    { key: 'reliability',   label: 'Zuverlässigkeit' },
  ];

  private readonly criterionSignals: Record<string, WritableSignal<number>> = {
    quality:       this.quality,
    punctuality:   this.punctuality,
    communication: this.communication,
    price_perf:    this.pricePerfRatio,
    reliability:   this.reliability,
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.contactId.set(idParam ? parseInt(idParam, 10) : 0);
  }

  getCriterionValue(key: string): number {
    return this.criterionSignals[key]();
  }

  setCriterionValue(key: string, value: number): void {
    this.criterionSignals[key].set(value);
  }

  submit(): void {
    this.error.set(null);
    this.evaluationApi.create(this.contactId(), {
      quality:       this.quality(),
      punctuality:   this.punctuality(),
      communication: this.communication(),
      price_perf:    this.pricePerfRatio(),
      reliability:   this.reliability(),
      note:          this.note() || null,
    }).subscribe({
      next: () => this.submitted.set(true),
      error: () => this.error.set('Fehler beim Speichern der Bewertung.'),
    });
  }
}
