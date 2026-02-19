import { Lead, LeadStatus, DateRange } from '../types/crm';
import { io, Socket } from 'socket.io-client';
import { faker } from '@faker-js/faker';

const STORAGE_KEY = 'dualite_crm_leads_v2';
const SERVER_URL_KEY = 'dualite_server_url'; // NEW: Persist server URL

class CrmServiceImpl {
  private socket: Socket | null = null;
  private serverUrl: string = '';
  private qrCallback: ((qr: string) => void) | null = null;
  private authCallback: (() => void) | null = null;
  private messageListeners: ((lead: Lead) => void)[] = [];
  private leadUpdateListeners: ((lead: Lead) => void)[] = [];
  private testMessageListeners: ((data: any) => void)[] = [];
  private healthListeners: ((health: any) => void)[] = [];

  // Demo Mode State
  private isDemoMode: boolean = false;
  private demoInterval: any = null;

  // --- SERVER CONNECTION ---
  getServerUrl() {
    // Check localStorage first for persisted URL
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved) return saved;
    return this.serverUrl || (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:3001';
  }

  async connectToServer(url: string): Promise<boolean> {
    // Handle Demo Mode
    if (url === 'demo') {
      this.isDemoMode = true;
      this.startDemoSimulation();
      return true;
    }

    this.isDemoMode = false;
    this.serverUrl = url;

    // PERSIST SERVER URL
    localStorage.setItem(SERVER_URL_KEY, url);
    console.log('💾 Server URL saved to localStorage:', url);

    try {
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket connection with proper options
      this.socket = io(url, {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        reconnection: true,
        reconnectionAttempts: 3,
        timeout: 5000
      });

      return new Promise((resolve) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        this.socket?.on('connect', () => {
          console.log('✅ Connected to backend successfully!');
          if (timeoutId) clearTimeout(timeoutId); // Clear timeout!
          this.setupSocketListeners();
          resolve(true);
        });

        this.socket?.on('connect_error', (error) => {
          console.error('❌ Connection failed:', error.message);
          if (timeoutId) clearTimeout(timeoutId); // Clear timeout!
          resolve(false);
        });

        // Timeout fallback - only triggers if no connection
        timeoutId = setTimeout(() => {
          console.warn('⏱️ Connection timeout');
          resolve(false);
        }, 5000);
      });
    } catch (e) {
      console.error('❌ Connection error:', e);
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
          this.messageListeners.forEach(cb => cb(savedLead));

        }, 15000);

      }, 2000);
    }, 500);
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('qr_code', (qr) => {
      console.log('📱 QR RECEIVED');
      if (this.qrCallback) this.qrCallback(qr);
    });

    this.socket.on('authenticated', () => {
      console.log('🔑 AUTHENTICATED');
      if (this.authCallback) this.authCallback();
    });

    this.socket.on('crm:test_incoming_message', (data: any) => {
      console.log('🧪 TEST MESSAGE:', data);
      this.testMessageListeners.forEach(cb => cb(data));
    });

    this.socket.on('crm:health_check', (health: any) => {
      this.healthListeners.forEach(cb => cb(health));
    });


    this.socket.on('new_message', async (data: any) => {
      console.log('⚡ SOCKET: new_message received', data);

      // 🛡️ DE-DUPLICATION CHECK
      const existingLeads = await this.getLeads();

      // Find matching lead by whatsapp_id
      const existingIndex = existingLeads.findIndex(l => (l as any).whatsapp_id === data.whatsapp_id);

      if (existingIndex !== -1) {
        // If we already have a "fast" emit and this is the "enriched" one, update the name
        if (!data.is_fast_emit && (existingLeads[existingIndex] as any).is_fast_emit) {
          console.log('🔄 Updating "fast" lead with enriched data:', data.name);
          const updatedLead = { ...existingLeads[existingIndex], name: data.name, is_fast_emit: false };
          await this.updateLead(updatedLead.id, updatedLead);
          this.messageListeners.forEach(cb => cb(updatedLead));
          return;
        }
        console.log('⏭️ Skipping duplicate message:', data.whatsapp_id);
        return;
      }

      // Final check for content similarity (fallback)
      const isContentDup = existingLeads.some(l =>
        l.phone === data.phone && l.last_message === data.message &&
        Math.abs(new Date(l.created_at).getTime() - new Date(data.timestamp).getTime()) < 30000
      );

      if (isContentDup) {
        console.log('⏭️ Skipping content duplicate');
        return;
      }

      // Convert incoming data to Lead format
      const newLead: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
        phone: data.phone,
        name: data.name || "WhatsApp User",
        last_message: data.message,
        status: 'new',
        source: 'whatsapp',
        value: 0,
        // @ts-ignore - tracking custom fields
        whatsapp_id: data.whatsapp_id,
        is_fast_emit: data.is_fast_emit
      };

      const savedLead = await this.addLead(newLead);
      console.log('✨ New lead saved:', savedLead.phone);
      this.messageListeners.forEach(cb => cb(savedLead));
    });

    // 🆕 NEW: Listen for database updates (status changes, etc.)
    this.socket.on('lead_updated', async (updatedLead: Lead) => {
      console.log('🔄 SOCKET: lead_updated received', updatedLead);

      // Update localStorage to match database
      const existingLeads = await this.getLeads();
      const index = existingLeads.findIndex(l => l.phone === updatedLead.phone);

      if (index !== -1) {
        await this.updateLead(existingLeads[index].id, updatedLead);
        console.log('✅ Lead synced with database');

        // Notify UI to refresh - use dedicated leadUpdateListeners
        this.leadUpdateListeners.forEach(cb => cb(updatedLead));
      }
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
    this.messageListeners.push(cb);
  }

  onLeadUpdated(cb: (lead: Lead) => void) {
    this.leadUpdateListeners.push(cb);
  }

  onTestMessage(cb: (data: any) => void) {
    this.testMessageListeners.push(cb);
  }

  onHealthCheck(cb: (health: any) => void) {
    this.healthListeners.push(cb);
  }

  async fetchRecentMessages(limit: number = 30): Promise<any[]> {
    if (!this.serverUrl) return [];
    try {
      const response = await fetch(`${this.serverUrl}/chats/recent?limit=${limit}`);
      const data = await response.json();
      return data.messages || [];
    } catch (e) {
      console.error('❌ Error fetching recent messages:', e);
      return [];
    }
  }



  // --- DATA METHODS (DATABASE API) ---
  async getLeads(dateRange?: DateRange): Promise<Lead[]> {
    // Try database API first
    if (this.serverUrl) {
      try {
        const params = new URLSearchParams();
        if (dateRange?.start) params.append('startDate', dateRange.start);
        if (dateRange?.end) params.append('endDate', dateRange.end);

        const response = await fetch(`${this.serverUrl}/api/leads?${params}`);
        if (response.ok) {
          const leads = await response.json();
          // Cache in localStorage for offline access
          localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
          return leads;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch from database, using localStorage fallback:', error);
      }
    }

    // Fallback to localStorage (offline mode or API unavailable)
    const raw = localStorage.getItem(STORAGE_KEY);
    let leads: Lead[] = raw ? JSON.parse(raw) : [];

    if (dateRange?.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      leads = leads.filter(l => new Date(l.created_at) >= startDate);
    }
    if (dateRange?.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      leads = leads.filter(l => new Date(l.created_at) <= endDate);
    }

    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async addLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    // Try database API first
    if (this.serverUrl) {
      try {
        const response = await fetch(`${this.serverUrl}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        });

        if (response.ok) {
          const savedLead = await response.json();
          console.log('✅ Lead saved to database:', savedLead.phone);

          // Update localStorage cache
          const raw = localStorage.getItem(STORAGE_KEY);
          const allLeads: Lead[] = raw ? JSON.parse(raw) : [];
          const updated = [savedLead, ...allLeads.filter(l => l.phone !== savedLead.phone)];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

          return savedLead;
        }
      } catch (error) {
        console.warn('⚠️ Failed to save to database, using localStorage:', error);
      }
    }

    // Fallback: localStorage only (offline mode)
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLeads: Lead[] = raw ? JSON.parse(raw) : [];
    const existingIndex = allLeads.findIndex(l => l.phone === lead.phone);

    if (existingIndex !== -1) {
      console.log(`♻️ Upserting existing lead (localStorage): ${lead.phone}`);
      const existingLead = allLeads[existingIndex];
      existingLead.last_message = lead.last_message;
      existingLead.updated_at = new Date().toISOString();
      if (lead.name) existingLead.name = lead.name;
      if (lead.source_contact_name) existingLead.source_contact_name = lead.source_contact_name;
      if (lead.source_message) existingLead.source_message = lead.source_message;
      if (lead.whatsapp_id) existingLead.whatsapp_id = lead.whatsapp_id;
      allLeads.splice(existingIndex, 1);
      const updatedList = [existingLead, ...allLeads];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      return existingLead;
    }

    const newLead: Lead = {
      ...lead,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newLead, ...allLeads];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newLead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
    // Update database if available
    if (this.serverUrl && updates.status) {
      try {
        const response = await fetch(`${this.serverUrl}/api/leads/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: updates.status })
        });

        if (response.ok) {
          console.log('✅ Lead status updated in database');
        }
      } catch (error) {
        console.warn('⚠️ Failed to update database:', error);
      }
    }

    // Always update localStorage cache
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
