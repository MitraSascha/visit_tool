import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { CategoryCount, DashboardStats } from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboardApi = inject(DashboardApiService);

  readonly stats$: Observable<DashboardStats> = this.dashboardApi.getStats();

  barPercent(count: number, list: CategoryCount[]): number {
    const max = Math.max(...list.map(i => i.count), 1);
    return Math.round((count / max) * 100);
  }

  priorityLabel(key: string): string {
    const map: Record<string, string> = {
      high: 'Hoch', medium: 'Mittel', low: 'Niedrig'
    };
    return map[key] ?? key;
  }
}
