import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProjectApiService } from '../../../core/services/project-api.service';
import { Project, ProjectStatus } from '../../../core/models/project.model';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList implements OnInit {
  private readonly projectApi = inject(ProjectApiService);

  readonly projects = signal<Project[]>([]);
  readonly showForm = signal(false);
  readonly newName = signal('');
  readonly newDescription = signal('');
  readonly newStatus = signal<ProjectStatus>('planned');
  readonly newAddress = signal('');

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.projectApi.getAll().subscribe(data => this.projects.set(data));
  }

  submitForm(): void {
    this.projectApi.create({
      name: this.newName(),
      description: this.newDescription() || null,
      address: this.newAddress() || null,
      status: this.newStatus(),
    }).subscribe(() => {
      this.showForm.set(false);
      this.newName.set('');
      this.newDescription.set('');
      this.newAddress.set('');
      this.newStatus.set('planned');
      this.loadProjects();
    });
  }

  deleteProject(id: number): void {
    this.projectApi.delete(id).subscribe(() => this.loadProjects());
  }

  statusLabel(s: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      planned: 'Geplant',
      active: 'Aktiv',
      completed: 'Abgeschlossen',
      cancelled: 'Abgebrochen',
    };
    return labels[s] ?? s;
  }

  statusClass(s: ProjectStatus): string {
    return s;
  }
}
