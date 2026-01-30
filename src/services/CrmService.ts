import { Lead, LeadStatus, DateRange } from '../types/crm';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY = 'dualite_crm_leads_v2';

class CrmServiceImpl {
  private socket: Socket | null = null;
  private serverUrl: string = '';
  private qrCallback: ((qr: string) => void) | null = null;
  private authCallback: (() => void) | null = null;
  private messageCallback: ((lead: Lead) => void) | null = null;

  // --- SERVER CONNECTION ---
  async connectToServer(url: string): Promise<boolean> {
    this.serverUrl = url;
    
    try {
      this.socket = io(url);
      
      return new Promise((resolve) => {
        this.socket?.on('connect', () => {
          console.log('Connected to backend');
          this.setupSocketListeners();
          resolve(true);
        });

        this.socket?.on('connect_error', () => {
          console.log('Connection failed');
          resolve(false);
        });
        
        // Timeout fallback
        setTimeout(() => resolve(false), 2000);
      });
    } catch (e) {
      return false;
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('qr', (qr) => {
      if (this.qrCallback) this.qrCallback(qr);
    });

    this.socket.on('authenticated', () => {
      if (this.authCallback) this.authCallback();
    });

    this.socket.on('new_message', async (data: any) => {
      // Convert incoming data to Lead format
      const newLead: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
        phone: data.phone,
        name: data.name,
        last_message: data.message,
        status: 'new',
        source: 'whatsapp',
        value: 0
      };
      
      const savedLead = await this.addLead(newLead);
      if (this.messageCallback) this.messageCallback(savedLead);
    });
  }

  // --- EVENT LISTENERS ---
  onQrCode(cb: (qr: string) => void) {
    this.qrCallback = cb;
  }

  onAuthenticated(cb: () => void) {
    this.authCallback = cb;
  }

  onNewMessage(cb: (lead: Lead) => void) {
    this.messageCallback = cb;
  }

  // --- EXISTING METHODS (UNCHANGED) ---
  async getLeads(dateRange?: DateRange): Promise<Lead[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    let leads: Lead[] = raw ? JSON.parse(raw) : [];
    
    if (dateRange?.start) {
      leads = leads.filter(l => new Date(l.created_at) >= new Date(dateRange.start!));
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      leads = leads.filter(l => new Date(l.created_at) <= endDate);
    }
    
    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async addLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const leads = await this.getLeads();
    const updated = [newLead, ...leads];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newLead;
  }

  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    const leads = await this.getLeads();
    const updated = leads.map(l => l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async deleteLead(id: string): Promise<void> {
    const leads = await this.getLeads();
    const updated = leads.filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export const CrmService = new CrmServiceImpl();
