import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Smartphone, X, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';
import { CrmService } from '../services/CrmService';

interface WhatsAppConnectProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WhatsAppConnect({ isConnected, onConnect, onDisconnect }: WhatsAppConnectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('offline');
  const [qrCode, setQrCode] = useState<string>('');

  // Check Server Status
  const checkServer = async () => {
    setServerStatus('checking');
    try {
      const isOnline = await CrmService.connectToServer(serverUrl);
      setServerStatus(isOnline ? 'online' : 'offline');
      
      if (isOnline) {
        // Start listening for QR
        CrmService.onQrCode((qr) => setQrCode(qr));
        CrmService.onAuthenticated(() => {
          onConnect();
          setIsOpen(false);
        });
      }
    } catch (e) {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkServer();
    }
  }, [isOpen]);

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 bg-green-950/30 border border-green-900/50 px-4 py-2 rounded-lg animate-in fade-in">
        <div className="relative">
          <Smartphone className="w-5 h-5 text-green-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-green-400">WhatsApp Active</span>
          <span className="text-[10px] text-green-500/70">Receiving real messages...</span>
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
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm",
          isOpen ? "bg-slate-900 text-slate-400" : "bg-slate-800 hover:bg-slate-700 text-white"
        )}
      >
        <Server className="w-4 h-4" />
        {isOpen ? 'Close Setup' : 'Connect Real Server'}
      </button>

      {/* Connection Popup */}
      {isOpen && (
        <div className="absolute top-12 right-0 z-50 w-80 animate-in fade-in zoom-in-95 duration-200">
          <Card className="bg-white text-slate-900 border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                 <Smartphone className="w-4 h-4 text-slate-600" />
                 Connect Backend
               </h3>
               <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-4 h-4" />
               </button>
            </div>
            
            <CardContent className="p-6 flex flex-col space-y-4">
              
              {/* Server URL Input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Server URL</label>
                  <span className={cn("text-[10px] flex items-center gap-1", 
                    serverStatus === 'online' ? "text-green-600" : 
                    serverStatus === 'checking' ? "text-yellow-600" : "text-red-600")}>
                    {serverStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {serverStatus.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={serverUrl} 
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="h-8 text-xs bg-slate-100 border-slate-200 text-slate-900" 
                  />
                  <button onClick={checkServer} className="p-2 bg-slate-200 rounded hover:bg-slate-300 text-slate-600">
                    <RefreshCw className={cn("w-4 h-4", serverStatus === 'checking' && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* QR Code Area */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-lg min-h-[160px]">
                {serverStatus === 'online' ? (
                  qrCode ? (
                    <div className="bg-white p-2 rounded shadow-sm">
                      <QRCode value={qrCode} size={128} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs">Generating QR Code...</span>
                    </div>
                  )
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Server Not Detected</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      1. Download the <code>server/</code> folder.<br/>
                      2. Run <code>npm install && npm start</code> locally.<br/>
                      3. Enter URL above.
                    </p>
                  </div>
                )}
              </div>

              {serverStatus === 'online' && (
                <p className="text-[10px] text-center text-green-600 font-medium">
                  Scan this QR with WhatsApp (Linked Devices)
                </p>
              )}

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
