import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="star-rating" [class.readonly]="readonly">
      @for (star of stars(); track star) {
        <button
          type="button"
          class="star"
          [class.filled]="star <= (hovered() ?? rating)"
          [disabled]="readonly"
          (mouseenter)="!readonly && hovered.set(star)"
          (mouseleave)="!readonly && hovered.set(null)"
          (click)="!readonly && select(star)"
          [attr.aria-label]="star + ' von 5 Sternen'"
        >★</button>
      }
      @if (!readonly && rating > 0) {
        <button type="button" class="clear-btn" (click)="select(0)" title="Bewertung löschen">✕</button>
      }
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .star {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.375rem;
      color: #d1d5db;
      padding: 0 1px;
      line-height: 1;
      transition: color 0.12s ease, transform 0.1s ease;
      &.filled { color: #f59e0b; }
      &:hover:not(:disabled) { transform: scale(1.15); }
    }
    .readonly .star { cursor: default; }
    .clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.75rem;
      color: #9ca3af;
      padding: 0 4px;
      &:hover { color: #ef4444; }
    }
  `]
})
export class StarRating {
  @Input() rating: number = 0;
  @Input() readonly: boolean = false;
  @Output() ratingChange = new EventEmitter<number>();

  readonly hovered = signal<number | null>(null);
  readonly stars   = computed(() => [1, 2, 3, 4, 5]);

  select(value: number): void {
    this.rating = value;
    this.ratingChange.emit(value);
    this.hovered.set(null);
  }
}
