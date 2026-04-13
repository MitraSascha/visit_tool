import { ChangeDetectionStrategy, Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderApiService } from '../../core/services/reminder-api.service';
import { ContactApiService } from '../../core/services/contact-api.service';
import { Reminder } from '../../core/models/reminder.model';
import { PartnerContact } from '../../core/models/contact.model';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reminders.html',
  styleUrl: './reminders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemindersComponent implements OnInit {
  private readonly reminderApi = inject(ReminderApiService);
  private readonly contactApi  = inject(ContactApiService);

  reminders       = signal<Reminder[]>([]);
  contacts        = signal<PartnerContact[]>([]);
  showForm        = signal(false);
  newNote         = signal('');
  newDueDate      = signal('');
  contactSearch   = signal('');
  selectedContact = signal<PartnerContact | null>(null);
  showDropdown    = signal(false);

  readonly filteredContacts = computed(() => {
    const q = this.contactSearch().toLowerCase().trim();
    if (!q) return this.contacts().slice(0, 10);
    return this.contacts()
      .filter(c =>
        c.company_name?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  });

  ngOnInit(): void {
    this.loadReminders();
    this.contactApi.getAll({ page_size: 200 })
      .subscribe(result => this.contacts.set(result.items));
  }

  private loadReminders(): void {
    this.reminderApi.getAll().subscribe(data => this.reminders.set(data));
  }

  selectContact(c: PartnerContact): void {
    this.selectedContact.set(c);
    this.contactSearch.set(c.company_name || c.contact_name || '');
    this.showDropdown.set(false);
  }

  clearContact(): void {
    this.selectedContact.set(null);
    this.contactSearch.set('');
  }

  onContactInput(value: string): void {
    this.contactSearch.set(value);
    this.selectedContact.set(null);
    this.showDropdown.set(value.length > 0);
  }

  toggleDone(r: Reminder): void {
    this.reminderApi.update(r.id, { is_done: !r.is_done }).subscribe(() => this.loadReminders());
  }

  deleteReminder(id: number): void {
    this.reminderApi.delete(id).subscribe(() => this.loadReminders());
  }

  isOverdue(r: Reminder): boolean {
    return new Date(r.due_date) < new Date() && !r.is_done;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  contactName(contactId: number): string {
    const c = this.contacts().find(x => x.id === contactId);
    return c ? (c.company_name || c.contact_name || `#${contactId}`) : `#${contactId}`;
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.newNote.set('');
      this.newDueDate.set('');
      this.selectedContact.set(null);
      this.contactSearch.set('');
      this.showDropdown.set(false);
    }
  }

  submitForm(): void {
    const contact = this.selectedContact();
    const dueDate = this.newDueDate();
    if (!contact || !dueDate) return;

    this.reminderApi.create({
      contact_id: contact.id,
      due_date: new Date(dueDate).toISOString(),
      note: this.newNote() || null,
    }).subscribe(() => {
      this.showForm.set(false);
      this.newNote.set('');
      this.newDueDate.set('');
      this.selectedContact.set(null);
      this.contactSearch.set('');
      this.loadReminders();
    });
  }
}
