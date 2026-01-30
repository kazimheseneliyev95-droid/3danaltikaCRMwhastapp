import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { Lead, LeadStatus } from '../types/crm';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { WhatsAppConnect } from '../components/WhatsAppConnect';
import { LeadForm } from '../components/LeadForm';
import { 
  MessageSquare, UserPlus, CheckCircle, XCircle, Plus, 
  Phone, Trash2, Calendar, Filter, RefreshCcw, Eraser, Pencil, ShoppingBag, DollarSign,
  TrendingUp, Users
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

export default function CRMPage() {
  const { 
    leads, 
    addLead, 
    updateLead,
    updateLeadStatus, 
    removeLead, 
    isWhatsAppConnected, 
    toggleWhatsAppConnection,
    dateRange,
    setDateRange
  } = useAppStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // --- METRICS CALCULATION ---
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalRevenue = leads
      .filter(l => l.status === 'won')
      .reduce((sum, l) => sum + (l.value || 0), 0);
    
    return { totalLeads, totalRevenue };
  }, [leads]);

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL local data? This cannot be undone.")) {
      leads.forEach(l => removeLead(l.id));
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowAddForm(true);
  };

  const handleSaveLead = (data: any) => {
    if (editingLead) {
      updateLead(editingLead.id, data);
    } else {
      addLead(data);
    }
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;

    const end = new Date();
    let start: Date | null = new Date();

    if (value === 'max') {
      start = null; // All time
    } else {
      const days = parseInt(value);
      start.setDate(end.getDate() - days);
    }

    const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };

    setDateRange({
      start: start ? toLocalISO(start) : null,
      end: toLocalISO(end)
    });
  };

  const columns: { id: LeadStatus; title: string; color: string; icon: any }[] = [
    { id: 'new', title: 'New Messages', color: 'blue', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'potential', title: 'Potential (Lead)', color: 'purple', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'won', title: 'Sold (Won)', color: 'green', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'lost', title: 'Lost / Ignored', color: 'slate', icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-full flex flex-col font-sans space-y-6">
      
      {/* HEADER & METRICS */}
      <div className="flex flex-col gap-6 border-b border-slate-800 pb-6">
        
        {/* Top Row: Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="text-green-500" />
              WhatsApp CRM
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm">
              <span className={isWhatsAppConnected ? "w-2 h-2 rounded-full bg-green-500 animate-pulse" : "w-2 h-2 rounded-full bg-red-500"}></span>
              {isWhatsAppConnected ? "Live Connection Active" : "Offline Mode (Manual Entry)"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <WhatsAppConnect 
              isConnected={isWhatsAppConnected} 
              onConnect={toggleWhatsAppConnection}
              onDisconnect={toggleWhatsAppConnection}
            />
            
            <button 
              onClick={() => { setEditingLead(null); setShowAddForm(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>

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

        {/* Second Row: Metrics & Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Summary Cards */}
          <div className="flex gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 px-5 flex items-center gap-4 min-w-[180px]">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-medium">Total Leads</p>
                <p className="text-xl font-bold text-white">{metrics.totalLeads}</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 px-5 flex items-center gap-4 min-w-[180px]">
              <div className="p-2 bg-green-500/10 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-medium">Total Sales</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(metrics.totalRevenue, 'AZN')}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
            <div className="px-2 text-slate-500 flex items-center gap-2 border-r border-slate-800 pr-3 mr-1">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-medium">Filter:</span>
            </div>
            
            {/* Dropdown Filter */}
            <select 
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
              onChange={handleDateFilterChange}
              defaultValue="30"
            >
              <option value="3">Last 3 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="15">Last 15 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="max">All Time (Max)</option>
            </select>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                className="w-28 h-8 text-[10px] bg-slate-950 border-slate-800 px-2"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-slate-600 text-xs">-</span>
              <Input 
                type="date" 
                className="w-28 h-8 text-[10px] bg-slate-950 border-slate-800 px-2"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ADD/EDIT FORM MODAL */}
      {showAddForm && (
        <LeadForm 
          initialData={editingLead || undefined}
          onSave={handleSaveLead}
          onCancel={() => { setShowAddForm(false); setEditingLead(null); }}
        />
      )}

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map((col) => (
            <div key={col.id} className="flex-1 min-w-[280px] flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 h-full max-h-[calc(100vh-280px)]">
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
                    onEdit={handleEdit}
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

function LeadCard({ lead, onUpdateStatus, onRemove, onEdit }: { lead: Lead, onUpdateStatus: any, onRemove: any, onEdit: any }) {
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
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(lead)} className="text-slate-500 hover:text-blue-400 p-1">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onRemove(lead.id)} className="text-slate-500 hover:text-red-400 p-1">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Product Name Badge */}
      {lead.product_name && (
        <div className="mb-2">
           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
             <ShoppingBag className="w-2.5 h-2.5" /> {lead.product_name}
           </span>
        </div>
      )}

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
