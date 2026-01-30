import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  removeLead: (id: string) => void;
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
    // Get first day of current month in local time
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    // Get last day of current month in local time
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
    
    // Format to YYYY-MM-DD using local time logic to avoid UTC shifts
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

  const loadLeads = async () => {
    setIsLoading(true);
    const data = await CrmService.getLeads(dateRange);
    setLeads(data);
    setIsLoading(false);
  };

  // --- ACTIONS ---

  const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    // 1. Auto-Sort Logic (The "Brain")
    let status: LeadStatus = 'new';
    const msg = leadData.last_message?.toLowerCase() || '';

    // Simple Rule Engine
    if (msg.includes('qiymət') || msg.includes('price') || msg.includes('neçəyə')) {
      status = 'potential';
    } else if (msg.includes('sifariş') || msg.includes('almaq') || msg.includes('buy')) {
      status = 'won'; // Or potential, depending on strictness
    }

    // 2. Create Lead
    const newLead = await CrmService.addLead({ ...leadData, status });
    
    // 3. Update State
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    await CrmService.updateStatus(id, status);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const removeLead = async (id: string) => {
    await CrmService.deleteLead(id);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

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
      updateLeadStatus, 
      removeLead, 
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
