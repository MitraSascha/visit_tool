import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ActivityLog } from '../../core/models/activity-log.model';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly logs = signal<ActivityLog[]>([]);

  ngOnInit(): void {
    this.http.get<ActivityLog[]>(`${environment.apiUrl}/activity-logs`).subscribe(
      data => this.logs.set(data)
    );
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  entityLabel(entityType: string): string {
    const labels: Record<string, string> = {
      contact:       'Kontakt',
      project:       'Projekt',
      group:         'Gruppe',
      evaluation:    'Bewertung',
      interaction:   'Interaktion',
      reminder:      'Erinnerung',
      user:          'Benutzer',
      asset:         'Datei',
    };
    return labels[entityType] ?? entityType;
  }
}
