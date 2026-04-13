import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { ReminderApiService } from '../../core/services/reminder-api.service';
import { CategoryCount, DashboardStats } from '../../core/models/dashboard.model';
import { Reminder } from '../../core/models/reminder.model';

interface DashboardData {
  stats: DashboardStats;
  upcoming: Reminder[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboardApi  = inject(DashboardApiService);
  private readonly reminderApi   = inject(ReminderApiService);

  readonly data$: Observable<DashboardData> = forkJoin({
    stats:     this.dashboardApi.getStats(),
    reminders: this.reminderApi.getAll(),
  }).pipe(
    map(({ stats, reminders }) => ({
      stats,
      upcoming: reminders
        .filter(r => !r.is_done)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 4),
    }))
  );

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  isOverdue(r: Reminder): boolean {
    return new Date(r.due_date) < new Date();
  }

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
