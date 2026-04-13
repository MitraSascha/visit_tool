import { PartnerContact } from './contact.model';

export interface DuplicateContact extends PartnerContact {
  similarity_score: number;
}
