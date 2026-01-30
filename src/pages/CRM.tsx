import React, { useState } from 'react';
import { useAppStore } from '../context/Store';
import { Lead, LeadStatus } from '../types/crm';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { WhatsAppConnect } from '../components/WhatsAppConnect';
import { LeadForm } from '../components/LeadForm';
import { 
  MessageSquare, UserPlus, CheckCircle, XCircle, Plus, 
  Phone, Trash2, Calendar, Filter, RefreshCcw, Eraser
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

  const [showAddForm, setShowAddForm] = useState(false);

  // NOTE: Simulation Logic Removed. 
  // We now rely on Manual Entry or (in future) Real Backend WebSocket.

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL local data? This cannot be undone.")) {
      leads.forEach(l => removeLead(l.id));
    }
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
            <span className={isWhatsAppConnected ? "w-2 h-2 rounded-full bg-green-500 animate-pulse" : "w-2 h-2 rounded-full bg-red-500"}></span>
            {isWhatsAppConnected ? "Live Connection Active" : "Offline Mode (Manual Entry)"}
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
                onClick={() => {
                   const now = new Date();
                   const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                   const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                   setDateRange({ start, end });
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Reset to Current Month"
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
          
          {/* MANUAL ADD BUTTON */}
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>

          {/* CLEAR DATA BUTTON */}
          {leads.length > 0 && (
             <button 
               onClick={handleClearAll}
               className="bg-red-950/30 hover:bg-red-900/50 text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-all border border-red-900/30"
               title="Clear all local data"
             >
               <Eraser className="w-4 h-4" />
             </button>
          )}
        </div>
      </div>

      {/* ADD FORM MODAL */}
      {showAddForm && (
        <LeadForm 
          onSave={addLead}
          onCancel={() => setShowAddForm(false)}
        />
      )}

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
                    No leads here
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {dateStr}
            </span>
            {lead.name && lead.name !== 'Unknown' && (
              <span className="text-[10px] text-blue-400 bg-blue-950/30 px-1 rounded">{lead.name}</span>
            )}
          </div>
        </div>
        <button onClick={() => onRemove(lead.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      {lead.last_message && (
        <div className="bg-slate-900/50 p-2 rounded mb-3 border border-slate-800/50">
          <p className="text-xs text-slate-300 line-clamp-2 italic">
            "{lead.last_message}"
          </p>
        </div>
      )}

      {lead.value && lead.value > 0 ? (
        <div className="mb-2 text-xs font-mono text-green-400 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> {lead.value} AZN
        </div>
      ) : null}

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
