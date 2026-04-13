import { Component, Input, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DuplicateApiService } from '../../../core/services/duplicate-api.service';
import { DuplicateContact } from '../../../core/models/duplicate.model';

@Component({
  selector: 'app-duplicate-dialog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './duplicate-dialog.html',
  styleUrl: './duplicate-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicateDialog implements OnInit {
  @Input() contactId!: number;

  private readonly api = inject(DuplicateApiService);

  readonly duplicates = signal<DuplicateContact[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.getDuplicates(this.contactId).subscribe({
      next: (list) => { this.duplicates.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  similarityPercent(score: number): string {
    return `${Math.round(score * 100)}%`;
  }
}
