import { Lead, LeadStatus, DateRange } from '../types/crm';

// Mock Supabase Client (Placeholder)
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient('URL', 'KEY');

const STORAGE_KEY = 'dualite_crm_leads_v2';

class CrmServiceImpl {
  private isSupabaseEnabled = false; // Toggle this when keys are added

  // --- FETCH LEADS ---
  async getLeads(dateRange?: DateRange): Promise<Lead[]> {
    if (this.isSupabaseEnabled) {
      // Future Supabase Code:
      // let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      // if (dateRange?.start) query = query.gte('created_at', dateRange.start);
      // if (dateRange?.end) query = query.lte('created_at', dateRange.end);
      // const { data } = await query;
      // return data || [];
      return [];
    } else {
      // Local Storage Mode
      const raw = localStorage.getItem(STORAGE_KEY);
      let leads: Lead[] = raw ? JSON.parse(raw) : [];
      
      // Apply Date Filter
      if (dateRange?.start) {
        leads = leads.filter(l => new Date(l.created_at) >= new Date(dateRange.start!));
      }
      if (dateRange?.end) {
        // Add one day to include the end date fully
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59);
        leads = leads.filter(l => new Date(l.created_at) <= endDate);
      }
      
      return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  // --- ADD LEAD ---
  async addLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.isSupabaseEnabled) {
      // await supabase.from('leads').insert(newLead);
    } else {
      const leads = await this.getLeads();
      const updated = [newLead, ...leads];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newLead;
  }

  // --- UPDATE STATUS ---
  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    if (this.isSupabaseEnabled) {
      // await supabase.from('leads').update({ status, updated_at: new Date() }).eq('id', id);
    } else {
      const leads = await this.getLeads();
      const updated = leads.map(l => l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }

  // --- DELETE LEAD ---
  async deleteLead(id: string): Promise<void> {
    if (this.isSupabaseEnabled) {
      // await supabase.from('leads').delete().eq('id', id);
    } else {
      const leads = await this.getLeads();
      const updated = leads.filter(l => l.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }
}

export const CrmService = new CrmServiceImpl();
