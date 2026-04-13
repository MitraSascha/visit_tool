import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderApiService } from '../../../core/services/reminder-api.service';
import { Reminder } from '../../../core/models/reminder.model';

@Component({
  selector: 'app-reminders-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reminders-widget.html',
  styleUrl: './reminders-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemindersWidgetComponent implements OnInit {
  private readonly reminderApi = inject(ReminderApiService);

  reminders = signal<Reminder[]>([]);

  ngOnInit(): void {
    this.reminderApi.getAll().subscribe(data => {
      const upcoming = data
        .filter(r => !r.is_done)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5);
      this.reminders.set(upcoming);
    });
  }

  isOverdue(r: Reminder): boolean {
    return new Date(r.due_date) < new Date() && !r.is_done;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }
}
