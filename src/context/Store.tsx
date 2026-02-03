import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Lead, LeadStatus, DateRange } from '../types/crm';
import { CrmService } from '../services/CrmService';

interface AppContextType {
  leads: Lead[];
  isLoading: boolean;
  isWhatsAppConnected: boolean;
  dateRange: DateRange;

  // Actions
  setDateRange: (range: DateRange) => void;
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  removeLead: (id: string) => void;
  syncLeadsFromWhatsApp: () => Promise<void>;
  toggleWhatsAppConnection: () => void;

  // Metrics
  getMetrics: () => { messages: number; potential: number; sales: number; revenue: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);

  // Initialize Date Range to Current Month (Local Time)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };

    return {
      start: toLocalISO(start),
      end: toLocalISO(end)
    };
  });

  // Initial Load & Filter Effect
  useEffect(() => {
    loadLeads();
  }, [dateRange]);

  // WhatsApp Message Listener - Register on mount (NOT dependent on connection state!)
  useEffect(() => {
    console.log('🚀 Registering WhatsApp message listener...');

    // ALWAYS listen for new incoming messages from backend
    CrmService.onNewMessage(async (newLead) => {
      console.log('%c📩 NEW WHATSAPP MESSAGE!', 'background: #25d366; color: white; font-size: 16px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
      console.log('   Phone:', newLead.phone);
      console.log('   Message:', newLead.last_message);

      // 1. Create fully populated Lead object
      const leadToSave: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
        phone: newLead.phone,
        name: newLead.name || `~${newLead.phone}`,
        last_message: newLead.last_message,
        source: 'whatsapp',
        status: 'new',
        value: 0,
        // @ts-ignore
        whatsapp_id: newLead.whatsapp_id || newLead.id,
        source_contact_name: newLead.name,
        source_message: newLead.last_message
      };

      // 2. PERSIST to Storage immediately!
      try {
        const savedLead = await CrmService.addLead(leadToSave);
        console.log('✅ Lead Saved to DB:', savedLead.id);

        // 3. Update UI state (Upsert Logic)
        setLeads((prev) => {
          // Check if this lead already exists in the UI (by ID or Phone)
          const existingIndex = prev.findIndex(l =>
            l.id === savedLead.id || l.phone === savedLead.phone
          );

          if (existingIndex !== -1) {
            console.log('🔄 Updating existing lead in UI:', savedLead.phone);
            const newList = [...prev];
            // Remove old version
            newList.splice(existingIndex, 1);
            // Add new version at top
            return [savedLead, ...newList];
          }

          // New Conversation
          console.log('➕ Adding new lead to UI:', savedLead.phone);
          return [savedLead, ...prev];
        });
      } catch (err) {
        console.error('Failed to save live lead:', err);
      }
    }); \r\n\r\n    // Listen for lead updates (status changes, etc.)\r\n    CrmService.onLeadUpdated(async (updatedLead) => {\r\n      console.log('🔄 LEAD UPDATED:', updatedLead);\r\n      \r\n      // Update UI state\r\n      setLeads((prev) => {\r\n        const existingIndex = prev.findIndex(l =>\r\n          l.id === updatedLead.id || l.phone === updatedLead.phone\r\n        );\r\n\r\n        if (existingIndex !== -1) {\r\n          console.log('✅ Updating lead in UI:', updatedLead.phone);\r\n          const newList = [...prev];\r\n          newList[existingIndex] = updatedLead;\r\n          return newList;\r\n        }\r\n\r\n        console.log('⚠️ Lead not found in UI, adding:', updatedLead.phone);\r\n        return [updatedLead, ...prev];\r\n      });\r\n    });

    // 🧪 TEST MODE LISTENER
    CrmService.onTestMessage((data: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧠 CRM TEST MESSAGE RECEIVED (TEST_MODE)');
      console.log('   Phone:', data.phone);
      console.log('   Name:', data.name);
      console.log('   Message:', data.message);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Create a test lead with a prefix for visual clarity
      const testLead: Lead = {
        id: 'test-' + Date.now(),
        phone: data.phone,
        name: `[TEST] ${data.name}`,
        last_message: data.message,
        status: 'new',
        source: 'whatsapp',
        value: 0,
        created_at: data.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setLeads((prev) => [testLead, ...prev]);
      console.log('✅ WhatsApp → Backend → Frontend → CRM SUCCESS');
    });

    // 🏥 HEALTH CHECK LISTENER
    CrmService.onHealthCheck((health) => {
      console.log('🏥 SYSTEM HEALTH:', health);
    });

    console.log('✅ Message listener registered successfully!');


    return () => {
      console.log('🔌 Unregistering message listener');
    };
  }, []); // Empty array - register ONCE on mount

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    console.log('🔍 Loading leads for range:', dateRange);
    const data = await CrmService.getLeads(dateRange);
    console.log(`📊 Found ${data.length} leads in range.`);
    setLeads(data);
    setIsLoading(false);
  }, [dateRange]);

  // --- ACTIONS ---

  const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    // 1. Auto-Sort Logic (The "Brain")
    let status: LeadStatus = 'new';
    const msg = leadData.last_message?.toLowerCase() || '';

    if (msg.includes('qiymət') || msg.includes('price') || msg.includes('neçəyə')) {
      status = 'potential';
    } else if (msg.includes('sifariş') || msg.includes('almaq') || msg.includes('buy')) {
      status = 'won';
    }

    // 2. Create Lead
    const newLead = await CrmService.addLead({ ...leadData, status });

    // 3. Update State (if it falls within current filter)
    // For simplicity, we just reload or prepend. 
    // Prepending is faster but might show items outside date range if user is looking at old data.
    // Let's just prepend for UX responsiveness.
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    await CrmService.updateLead(id, updates);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    await CrmService.updateStatus(id, status);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const removeLead = useCallback((id: string) => {
    CrmService.deleteLead(id).then(() => {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    });
  }, []);

  const syncLeadsFromWhatsApp = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting manual sync from WhatsApp...');
      const messages = await CrmService.fetchRecentMessages(30);
      const existingLeads = await CrmService.getLeads(); // Get ALL for proper de-duplication

      let newLeadsAdded = 0;

      for (const msg of messages) {
        // De-duplication check: WhatsApp ID or (Phone + Message)
        const exists = existingLeads.some(l =>
          (l as any).whatsapp_id === msg.whatsapp_id ||
          (l.phone === msg.phone && l.last_message === msg.message)
        );

        if (!exists) {
          const leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
            phone: msg.phone,
            name: msg.name,
            last_message: msg.message,
            status: 'new',
            source: 'whatsapp',
            value: 0,
            // @ts-ignore
            whatsapp_id: msg.whatsapp_id
          };

          // PERSIST to localStorage
          await CrmService.addLead(leadData);
          newLeadsAdded++;
        }
      }

      console.log(`✅ Sync complete. Added ${newLeadsAdded} new leads to storage.`);

      // RELOAD from storage to ensure UI is in sync with persistent data and filters
      await loadLeads();

      if (newLeadsAdded > 0) {
        console.log('🔄 UI refreshed with new sync data');
      }
    } catch (e) {
      console.error('❌ Sync failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [loadLeads]);
  const toggleWhatsAppConnection = () => {
    setIsWhatsAppConnected(!isWhatsAppConnected);
  };

  // --- METRICS ---
  const getMetrics = () => {
    const messages = leads.length;
    const potential = leads.filter(l => l.status === 'potential' || l.status === 'won').length;
    const sales = leads.filter(l => l.status === 'won').length;
    const revenue = leads.filter(l => l.status === 'won').reduce((acc, curr) => acc + (curr.value || 0), 0);

    return { messages, potential, sales, revenue };
  };

  return (
    <AppContext.Provider value={{
      leads,
      isLoading,
      isWhatsAppConnected,
      dateRange,
      setDateRange,
      addLead,
      updateLead,
      updateLeadStatus,
      removeLead,
      syncLeadsFromWhatsApp,
      toggleWhatsAppConnection,
      getMetrics
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
