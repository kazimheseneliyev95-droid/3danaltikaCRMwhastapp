import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Smartphone, X, Server, Wifi, WifiOff, RefreshCw, PlayCircle, AlertTriangle } from 'lucide-react';
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
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'demo'>('offline');
  const [qrCode, setQrCode] = useState<string>('');

  // Check Server Status
  const checkServer = async (url: string = serverUrl) => {
    setServerStatus('checking');
    try {
      const isOnline = await CrmService.connectToServer(url);
      setServerStatus(url === 'demo' ? 'demo' : (isOnline ? 'online' : 'offline'));
      
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

  const handleDisconnect = () => {
    CrmService.disconnect();
    onDisconnect();
    setServerStatus('offline');
  };

  useEffect(() => {
    if (isOpen && !isConnected) {
      // Don't auto-check on open if we are just looking
    }
  }, [isOpen]);

  if (isConnected) {
    return (
      <div className={cn("flex items-center gap-3 border px-4 py-2 rounded-lg animate-in fade-in", 
        serverStatus === 'demo' ? "bg-blue-950/30 border-blue-900/50" : "bg-green-950/30 border-green-900/50")}>
        <div className="relative">
          <Smartphone className={cn("w-5 h-5", serverStatus === 'demo' ? "text-blue-400" : "text-green-400")} />
          <div className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse", serverStatus === 'demo' ? "bg-blue-500" : "bg-green-500")} />
        </div>
        <div className="flex flex-col">
          <span className={cn("text-xs font-bold", serverStatus === 'demo' ? "text-blue-400" : "text-green-400")}>
            {serverStatus === 'demo' ? "Demo Mode Active" : "WhatsApp Active"}
          </span>
          <span className={cn("text-[10px]", serverStatus === 'demo' ? "text-blue-500/70" : "text-green-500/70")}>
            {serverStatus === 'demo' ? "Simulating incoming leads..." : "Receiving real messages..."}
          </span>
        </div>
        <button 
          onClick={handleDisconnect}
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
        {isOpen ? 'Close Setup' : 'Connect Server'}
      </button>

      {/* Connection Popup */}
      {isOpen && (
        <div className="absolute top-12 right-0 z-50 w-96 animate-in fade-in zoom-in-95 duration-200">
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
            
            <CardContent className="p-6 flex flex-col space-y-6">
              
              {/* Demo Mode Option */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2">
                  <PlayCircle className="w-3 h-3" /> No Server? Try Demo Mode
                </h4>
                <p className="text-[10px] text-blue-600 mb-3">
                  Simulate a connection to see how the CRM works. We'll generate fake incoming messages for you.
                </p>
                <button 
                  onClick={() => checkServer('demo')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                >
                  Start Demo Simulation
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full absolute"></div>
                <span className="bg-white px-2 text-[10px] text-slate-400 relative uppercase font-medium">OR Connect Real Server</span>
              </div>

              {/* Real Server URL Input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Server URL (Localhost)</label>
                  <span className={cn("text-[10px] flex items-center gap-1", 
                    serverStatus === 'online' ? "text-green-600" : 
                    serverStatus === 'checking' ? "text-yellow-600" : "text-red-600")}>
                    {serverStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {serverStatus === 'online' ? "ONLINE" : serverStatus === 'checking' ? "CHECKING" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={serverUrl} 
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="h-9 text-xs bg-slate-100 border-slate-200 text-slate-900" 
                    placeholder="http://localhost:3001"
                  />
                  <button onClick={() => checkServer(serverUrl)} className="px-3 bg-slate-200 rounded hover:bg-slate-300 text-slate-600">
                    <RefreshCw className={cn("w-4 h-4", serverStatus === 'checking' && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* QR Code Area */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-lg min-h-[160px]">
                {serverStatus === 'online' || serverStatus === 'demo' ? (
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
                    <div className="text-[10px] text-slate-400 leading-tight text-left bg-slate-50 p-2 rounded border border-slate-200">
                      <p className="font-bold mb-1">Deployment Note:</p>
                      <p>Netlify only hosts the frontend. To use real WhatsApp:</p>
                      <ol className="list-decimal ml-3 mt-1 space-y-0.5">
                        <li>Run <code>npm start</code> in <code>server/</code> folder locally.</li>
                        <li>Or deploy <code>server/</code> to Railway/Render.</li>
                        <li>Enter that URL above.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {(serverStatus === 'online' || serverStatus === 'demo') && (
                <p className="text-[10px] text-center text-green-600 font-medium">
                  {serverStatus === 'demo' ? "Demo Mode: Waiting for fake authentication..." : "Scan this QR with WhatsApp (Linked Devices)"}
                </p>
              )}

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
