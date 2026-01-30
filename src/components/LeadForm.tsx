import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { X, Save, Phone, User, MessageSquare, DollarSign } from 'lucide-react';
import { Lead } from '../types/crm';

interface LeadFormProps {
  onSave: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

export function LeadForm({ onSave, onCancel }: LeadFormProps) {
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    message: '',
    value: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) return;

    onSave({
      phone: formData.phone,
      name: formData.name || 'Unknown',
      last_message: formData.message,
      value: parseFloat(formData.value) || 0,
      status: 'new', // Default status
      source: 'manual'
    });
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Add Real Lead
          </CardTitle>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-3 h-3" /> Phone Number *
              </Label>
              <Input 
                required
                placeholder="+994 50 000 00 00" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="bg-slate-950 border-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-3 h-3" /> Customer Name
              </Label>
              <Input 
                placeholder="Ali Mammadov" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="bg-slate-950 border-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Last Message / Note
              </Label>
              <Input 
                placeholder="Interested in product X..." 
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="bg-slate-950 border-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Potential Value (AZN)
              </Label>
              <Input 
                type="number"
                placeholder="0.00" 
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                className="bg-slate-950 border-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button" 
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Lead
              </button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
