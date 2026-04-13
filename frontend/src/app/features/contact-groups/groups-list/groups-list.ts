import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { ContactGroupApiService } from '../../../core/services/contact-group-api.service';
import { ContactGroup } from '../../../core/models/contact-group.model';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [],
  templateUrl: './groups-list.html',
  styleUrl: './groups-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactGroupsList implements OnInit {
  private readonly groupApi = inject(ContactGroupApiService);

  readonly groups = signal<ContactGroup[]>([]);
  readonly showForm = signal(false);
  readonly newName = signal('');
  readonly newDescription = signal('');
  readonly newColor = signal('#4ade80');

  ngOnInit(): void {
    this.loadGroups();
  }

  private loadGroups(): void {
    this.groupApi.getAll().subscribe(data => this.groups.set(data));
  }

  submitForm(): void {
    this.groupApi.create({
      name: this.newName(),
      description: this.newDescription() || null,
      color: this.newColor(),
    }).subscribe(() => {
      this.showForm.set(false);
      this.newName.set('');
      this.newDescription.set('');
      this.newColor.set('#4ade80');
      this.loadGroups();
    });
  }

  deleteGroup(id: number): void {
    this.groupApi.delete(id).subscribe(() => this.loadGroups());
  }

  groupStyle(color: string | null): string {
    return color ? `background-color: ${color}` : '';
  }
}
