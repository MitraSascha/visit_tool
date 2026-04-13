import { Component, Input, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InteractionApiService } from '../../../core/services/interaction-api.service';
import { Interaction, InteractionType, INTERACTION_TYPE_LABELS } from '../../../core/models/interaction.model';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Timeline implements OnInit {
  @Input() contactId!: number;

  private readonly api = inject(InteractionApiService);
  private readonly fb = inject(FormBuilder);

  readonly interactions = signal<Interaction[]>([]);
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly typeLabels = INTERACTION_TYPE_LABELS;
  readonly typeOptions: InteractionType[] = ['call', 'meeting', 'email', 'note'];

  readonly form = this.fb.nonNullable.group({
    date: [new Date().toISOString().slice(0, 16), Validators.required],
    type: ['call' as InteractionType, Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll(this.contactId).subscribe({
      next: (list) => { this.interactions.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.api.create(this.contactId, { date: new Date(v.date).toISOString(), type: v.type, note: v.note || null }).subscribe({
      next: (item) => {
        this.interactions.update(list => [item, ...list]);
        this.form.reset({ date: new Date().toISOString().slice(0, 16), type: 'call', note: '' });
        this.showForm.set(false);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  remove(id: number): void {
    this.api.delete(id).subscribe(() => {
      this.interactions.update(list => list.filter(i => i.id !== id));
    });
  }
}
