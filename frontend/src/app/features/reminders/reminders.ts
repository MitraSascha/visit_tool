import { ChangeDetectionStrategy, Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReminderApiService } from '../../core/services/reminder-api.service';
import { ContactApiService } from '../../core/services/contact-api.service';
import { CrmApiService } from '../../core/services/crm-api.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { Reminder, NOTIFY_BEFORE_OPTIONS } from '../../core/models/reminder.model';
import { CrmEvent, CRM_DAY_OPTIONS } from '../../core/models/crm-event.model';
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
  private readonly crmApi      = inject(CrmApiService);
  readonly push                = inject(PushNotificationService);

  readonly pushStatus = signal<'idle' | 'loading' | 'ok' | 'denied' | 'unsupported'>('idle');

  reminders          = signal<Reminder[]>([]);
  contacts           = signal<PartnerContact[]>([]);
  showForm           = signal(false);
  newNote            = signal('');
  newDueDate         = signal('');
  newNotifyBefore    = signal(30);
  contactSearch      = signal('');
  selectedContact    = signal<PartnerContact | null>(null);
  showDropdown       = signal(false);

  readonly notifyBeforeOptions = NOTIFY_BEFORE_OPTIONS;

  // CRM
  readonly showCrm          = signal(false);
  readonly crmDays          = signal(7);
  readonly crmEvents        = signal<CrmEvent[]>([]);
  readonly crmLoading       = signal(false);
  readonly crmError         = signal<string | null>(null);
  readonly crmSaved         = signal<Set<number>>(new Set());
  readonly crmDayOptions    = CRM_DAY_OPTIONS;
  readonly crmNotifyMap     = signal<Map<number, number>>(new Map());  // eventId → minutes

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

  contactName(contactId: number | null): string {
    if (!contactId) return 'CRM-Termin';
    const c = this.contacts().find(x => x.id === contactId);
    return c ? (c.company_name || c.contact_name || `#${contactId}`) : `#${contactId}`;
  }

  toggleCrm(): void {
    this.showCrm.update(v => !v);
    if (this.showCrm() && this.crmEvents().length === 0) {
      this.loadCrmEvents();
    }
  }

  loadCrmEvents(): void {
    this.crmLoading.set(true);
    this.crmError.set(null);
    this.crmApi.getEvents(this.crmDays()).subscribe({
      next: events => { this.crmEvents.set(events); this.crmLoading.set(false); },
      error: ()     => { this.crmError.set('Termine konnten nicht geladen werden.'); this.crmLoading.set(false); },
    });
  }

  changeCrmDays(days: number): void {
    this.crmDays.set(days);
    this.loadCrmEvents();
  }

  getCrmNotify(eventId: number): number {
    return this.crmNotifyMap().get(eventId) ?? 30;
  }

  setCrmNotify(eventId: number, minutes: number): void {
    this.crmNotifyMap.update(m => new Map(m).set(eventId, minutes));
  }

  saveCrmAsReminder(event: CrmEvent): void {
    this.reminderApi.create({
      due_date: event.start,
      note: event.title,
      notify_before_minutes: this.getCrmNotify(event.id),
    }).subscribe(() => {
      this.crmSaved.update(s => new Set([...s, event.id]));
      this.loadReminders();
    });
  }

  formatCrmDate(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  async enablePush(): Promise<void> {
    this.pushStatus.set('loading');
    const result = await this.push.requestAndSubscribe();
    this.pushStatus.set(result === 'ok' ? 'ok' : result);
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.newNote.set('');
      this.newDueDate.set('');
      this.newNotifyBefore.set(30);
      this.selectedContact.set(null);
      this.contactSearch.set('');
      this.showDropdown.set(false);
    }
  }

  submitForm(): void {
    const dueDate = this.newDueDate();
    if (!dueDate) return;

    this.reminderApi.create({
      contact_id: this.selectedContact()?.id ?? null,
      due_date: new Date(dueDate).toISOString(),
      note: this.newNote() || null,
      notify_before_minutes: this.newNotifyBefore(),
    }).subscribe(() => {
      this.showForm.set(false);
      this.newNote.set('');
      this.newDueDate.set('');
      this.newNotifyBefore.set(30);
      this.selectedContact.set(null);
      this.contactSearch.set('');
      this.loadReminders();
    });
  }

  notifyBeforeLabel(minutes: number): string {
    return this.notifyBeforeOptions.find(o => o.value === minutes)?.label ?? `${minutes} Min. vorher`;
  }
}
