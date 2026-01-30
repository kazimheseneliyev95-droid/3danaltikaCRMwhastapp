import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface WhatsAppConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WhatsAppConnect({ isConnected, onConnect, onDisconnect }: WhatsAppConnectProps) {
  const [step, setStep] = useState<'idle' | 'scanning' | 'connecting' | 'connected'>('idle');

  useEffect(() => {
    if (isConnected) setStep('connected');
    else setStep('idle');
  }, [isConnected]);

  const handleScan = () => {
    setStep('scanning');
    // Simulate scanning delay
    setTimeout(() => {
      setStep('connecting');
      setTimeout(() => {
        onConnect();
      }, 1500);
    }, 2000);
  };

  if (step === 'connected') {
    return (
      <div className="flex items-center gap-3 bg-green-950/30 border border-green-900/50 px-4 py-2 rounded-lg">
        <div className="relative">
          <Smartphone className="w-5 h-5 text-green-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-green-400">WhatsApp Active</span>
          <span className="text-[10px] text-green-500/70">Syncing messages...</span>
        </div>
        <button 
          onClick={onDisconnect}
          className="ml-2 text-[10px] text-slate-500 hover:text-red-400 underline decoration-dotted"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button 
        onClick={() => setStep(step === 'idle' ? 'scanning' : 'idle')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          step === 'idle' ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-900 text-slate-400"
        )}
      >
        <QrCode className="w-4 h-4" />
        {step === 'idle' ? 'Connect WhatsApp' : 'Cancel Connection'}
      </button>

      {/* QR Code Popup */}
      {step !== 'idle' && (
        <div className="absolute top-12 right-0 z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
          <Card className="bg-white text-slate-900 border-slate-200 shadow-2xl">
            <CardContent className="p-4 flex flex-col items-center text-center space-y-4">
              {step === 'scanning' && (
                <>
                  <h3 className="font-bold text-slate-800">Scan QR Code</h3>
                  <p className="text-xs text-slate-500">Open WhatsApp on your phone > Settings > Linked Devices</p>
                  <div className="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-slate-200 relative overflow-hidden cursor-pointer" onClick={handleScan}>
                    <QrCode className="w-24 h-24 text-slate-800 opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/20 to-transparent h-full w-full animate-scan" />
                    <span className="absolute text-xs font-bold text-slate-600 bg-white/80 px-2 py-1 rounded">Click to Scan</span>
                  </div>
                </>
              )}
              
              {step === 'connecting' && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                  <span className="text-sm font-medium text-slate-600">Connecting securely...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
