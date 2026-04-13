import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { PartnerContact } from '../models/contact.model';

class CardVaultDb extends Dexie {
  contacts!: Table<PartnerContact, number>;

  constructor() {
    super('card_vault_offline');
    this.version(1).stores({
      contacts: 'id, company_name, city, category, updated_at',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class OfflineContactStore {
  private readonly db = new CardVaultDb();

  async syncFromApi(contacts: PartnerContact[]): Promise<void> {
    await this.db.contacts.bulkPut(contacts);
  }

  async getAll(): Promise<PartnerContact[]> {
    return this.db.contacts.orderBy('company_name').toArray();
  }

  async getById(id: number): Promise<PartnerContact | undefined> {
    return this.db.contacts.get(id);
  }

  async clear(): Promise<void> {
    await this.db.contacts.clear();
  }
}
