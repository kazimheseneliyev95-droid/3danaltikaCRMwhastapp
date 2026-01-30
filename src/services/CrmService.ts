import { Lead, LeadStatus, DateRange } from '../types/crm';
import { io, Socket } from 'socket.io-client';
import { faker } from '@faker-js/faker';

const STORAGE_KEY = 'dualite_crm_leads_v2';

class CrmServiceImpl {
  private socket: Socket | null = null;
  private serverUrl: string = '';
  private qrCallback: ((qr: string) => void) | null = null;
  private authCallback: (() => void) | null = null;
  private messageCallback: ((lead: Lead) => void) | null = null;
  
  // Demo Mode State
  private isDemoMode: boolean = false;
  private demoInterval: any = null;

  // --- SERVER CONNECTION ---
  async connectToServer(url: string): Promise<boolean> {
    // Handle Demo Mode
    if (url === 'demo') {
      this.isDemoMode = true;
      this.startDemoSimulation();
      return true;
    }

    this.isDemoMode = false;
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

  disconnect() {
    if (this.isDemoMode) {
      this.isDemoMode = false;
      if (this.demoInterval) clearInterval(this.demoInterval);
      if (this.authCallback) this.authCallback(); // Trigger disconnect cleanup if needed
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private startDemoSimulation() {
    console.log("Starting Demo Simulation...");
    
    // Simulate QR Code delay then Auth
    setTimeout(() => {
      if (this.qrCallback) this.qrCallback('DEMO_QR_CODE_DATA');
      
      // Auto authenticate after 2 seconds
      setTimeout(() => {
        if (this.authCallback) this.authCallback();
        
        // Start sending fake messages every 15-30 seconds
        this.demoInterval = setInterval(async () => {
          if (!this.isDemoMode) return;
          
          const fakeLead: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
            phone: faker.phone.number(),
            name: faker.person.fullName(),
            last_message: faker.helpers.arrayElement([
              "Salam, qiymət?", 
              "How much is this?", 
              "Çatdırılma var?", 
              "Sifariş vermək istəyirəm", 
              "Rəngləri var?"
            ]),
            status: 'new',
            source: 'whatsapp',
            value: 0
          };
          
          const savedLead = await this.addLead(fakeLead);
          if (this.messageCallback) this.messageCallback(savedLead);
          
        }, 15000);

      }, 2000);
    }, 500);
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

  // --- DATA METHODS ---
  async getLeads(dateRange?: DateRange): Promise<Lead[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    let leads: Lead[] = raw ? JSON.parse(raw) : [];
    
    if (dateRange?.start) {
      // Start of day
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      leads = leads.filter(l => new Date(l.created_at) >= startDate);
    }
    if (dateRange?.end) {
      // End of day
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
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

    const leads = await this.getLeads(); // Get all leads ignoring filter for storage
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLeads: Lead[] = raw ? JSON.parse(raw) : [];

    const updated = [newLead, ...allLeads];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newLead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLeads: Lead[] = raw ? JSON.parse(raw) : [];
    
    const updated = allLeads.map(l => 
      l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    await this.updateLead(id, { status });
  }

  async deleteLead(id: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLeads: Lead[] = raw ? JSON.parse(raw) : [];
    
    const updated = allLeads.filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

export const CrmService = new CrmServiceImpl();
