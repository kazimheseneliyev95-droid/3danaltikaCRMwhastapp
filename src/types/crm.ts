export type LeadStatus = 'new' | 'potential' | 'won' | 'lost';

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  status: LeadStatus;
  last_message?: string;
  value?: number;
  created_at: string; // ISO Date String
  updated_at: string;
  source: 'whatsapp' | 'manual';
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

// Supabase Table Definition (for future reference)
/*
  Table: leads
  - id: uuid (PK)
  - phone: text
  - name: text
  - status: text
  - last_message: text
  - value: numeric
  - created_at: timestamptz
  - updated_at: timestamptz
  - source: text
*/
