import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { Lead, LeadStatus } from '../types/crm';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { WhatsAppConnect } from '../components/WhatsAppConnect';
import { 
  MessageSquare, UserPlus, CheckCircle, XCircle, Plus, 
  Phone, Trash2, Calendar, Filter, RefreshCcw 
} from 'lucide-react';

export default function CRMPage() {
  const { 
    leads, 
    addLead, 
    updateLeadStatus, 
    removeLead, 
    isWhatsAppConnected, 
    toggleWhatsAppConnection,
    dateRange,
    setDateRange
  } = useAppStore();

  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-Simulation Effect when Connected
  useEffect(() => {
    let interval: any;
    if (isWhatsAppConnected) {
      interval = setInterval(() => {
        // 20% chance to get a message every 5 seconds
        if (Math.random() > 0.8) {
          simulateIncomingMessage(true);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isWhatsAppConnected]);

  const simulateIncomingMessage = (auto = false) => {
    if (!auto) setIsSimulating(true);
    
    setTimeout(() => {
      const randomNames = ['+994 50 222 33 44', 'Ali Mammadov', '+994 55 111 22 33', 'Leyla H.', 'Murad Aliyev', 'Nigar Q.'];
      const randomMsgs = [
        'Salam, qiymət?', // Should go to Potential
        'Çatdırılma neçəyədir?', 
        'Sizdə bu məhsul var?', 
        'Sifariş etmək istəyirəm', // Should go to Won/Potential
        'Endirim edirsiniz?',
        'Salam'
      ];
      
      const msg = randomMsgs[Math.floor(Math.random() * randomMsgs.length)];

      addLead({
        phone: randomNames[Math.floor(Math.random() * randomNames.length)],
        name: 'Unknown User',
        last_message: msg,
        status: 'new', // The Store will auto-sort this based on content
        value: 0,
        source: 'whatsapp'
      });
      
      if (!auto) setIsSimulating(false);
    }, 800);
  };

  const columns: { id: LeadStatus; title: string; color: string; icon: any }[] = [
    { id: 'new', title: 'New Messages', color: 'blue', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'potential', title: 'Potential (Lead)', color: 'purple', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'won', title: 'Sold (Won)', color: 'green', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'lost', title: 'Lost / Ignored', color: 'slate', icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-green-500" />
            WhatsApp CRM
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time pipeline management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          
          {/* DATE FILTER */}
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <div className="px-2 text-slate-500">
              <Filter className="w-4 h-4" />
            </div>
            <Input 
              type="date" 
              className="w-32 h-8 text-xs bg-slate-950 border-slate-800"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-slate-600">-</span>
            <Input 
              type="date" 
              className="w-32 h-8 text-xs bg-slate-950 border-slate-800"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
            {(dateRange.start || dateRange.end) && (
              <button 
                onClick={() => setDateRange({ start: null, end: null })}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <RefreshCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* WHATSAPP CONNECT */}
          <WhatsAppConnect 
            isConnected={isWhatsAppConnected} 
            onConnect={toggleWhatsAppConnection}
            onDisconnect={toggleWhatsAppConnection}
          />
          
          {/* MANUAL SIMULATION */}
          {!isWhatsAppConnected && (
            <button 
              onClick={() => simulateIncomingMessage(false)}
              disabled={isSimulating}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isSimulating ? 'Receiving...' : <><Plus className="w-4 h-4" /> Test Msg</>}
            </button>
          )}
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map((col) => (
            <div key={col.id} className="flex-1 min-w-[280px] flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 h-full max-h-[calc(100vh-180px)]">
              {/* Column Header */}
              <div className={`p-4 border-b border-slate-800 flex items-center justify-between bg-${col.color}-950/10`}>
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <div className={`p-1.5 rounded bg-${col.color}-500/20 text-${col.color}-400`}>
                    {col.icon}
                  </div>
                  {col.title}
                </div>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                  {leads.filter(l => l.status === col.id).length}
                </Badge>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {leads.filter(l => l.status === col.id).map((lead) => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    onUpdateStatus={updateLeadStatus}
                    onRemove={removeLead}
                  />
                ))}
                {leads.filter(l => l.status === col.id).length === 0 && (
                  <div className="text-center py-12 flex flex-col items-center gap-2 text-slate-600 text-sm border-2 border-dashed border-slate-800/50 rounded-lg mx-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                      <span className="text-xs">0</span>
                    </div>
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, onUpdateStatus, onRemove }: { lead: Lead, onUpdateStatus: any, onRemove: any }) {
  const dateStr = new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-sm hover:border-slate-600 transition-all duration-200 group relative">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
            <Phone className="w-3 h-3 text-green-500" />
            {lead.phone}
          </div>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> {dateStr}
          </span>
        </div>
        <button onClick={() => onRemove(lead.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      <div className="bg-slate-900/50 p-2 rounded mb-3 border border-slate-800/50">
        <p className="text-xs text-slate-300 line-clamp-2 italic">
          "{lead.last_message}"
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 mt-2 opacity-80 hover:opacity-100 transition-opacity">
        {lead.status !== 'new' && (
           <button onClick={() => onUpdateStatus(lead.id, 'new')} className="flex-1 py-1.5 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 rounded border border-slate-800 transition-colors">
             New
           </button>
        )}
        {lead.status !== 'potential' && (
          <button onClick={() => onUpdateStatus(lead.id, 'potential')} className="flex-1 py-1.5 text-[10px] font-medium bg-purple-950/20 hover:bg-purple-900/40 text-purple-400 rounded border border-purple-900/30 transition-colors">
            Lead
          </button>
        )}
        {lead.status !== 'won' && (
          <button onClick={() => onUpdateStatus(lead.id, 'won')} className="flex-1 py-1.5 text-[10px] font-medium bg-green-950/20 hover:bg-green-900/40 text-green-400 rounded border border-green-900/30 transition-colors">
            Sale
          </button>
        )}
        {lead.status !== 'lost' && (
           <button onClick={() => onUpdateStatus(lead.id, 'lost')} className="flex-1 py-1.5 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-500 rounded border border-slate-800 transition-colors">
             X
           </button>
        )}
      </div>
    </div>
  );
}
