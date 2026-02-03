import { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Smartphone, Send, ShieldCheck, Database, Zap } from 'lucide-react';

export default function MetaLab() {
    const [phone, setPhone] = useState('994501234567');
    const [name, setName] = useState('Kazim Meta');
    const [message, setMessage] = useState('Salam, bu Meta Cloud API sınağıdır!');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const simulateWebhook = async () => {
        setStatus('sending');
        try {
            // Simulate the Meta Webhook Payload
            const payload = {
                object: 'whatsapp_business_account',
                entry: [{
                    id: 'WABA_ID',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: { display_phone_number: '123456789', phone_number_id: 'PNID' },
                            contacts: [{ profile: { name: name }, wa_id: phone }],
                            messages: [{
                                from: phone,
                                id: 'wamid.' + Math.random().toString(36).substr(2, 20),
                                timestamp: Math.floor(Date.now() / 1000).toString(),
                                text: { body: message },
                                type: 'text'
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            };

            const response = await fetch('http://localhost:3001/api/webhooks/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ShieldCheck className="text-blue-500 w-8 h-8" />
                    Meta Cloud API Lab
                </h1>
                <p className="text-slate-400">
                    Bu səhifə Meta Cloud API memarlığını sınaqdan keçirmək üçündür.
                    Real WhatsApp qoşulmadan webhook-un necə işlədiyini test edin.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Simulator Controls */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 text-white">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                            <h3 className="font-bold flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-blue-400" />
                                Webhook Simulator
                            </h3>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Phone Number (Sender)</label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Profile Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Message Body</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={simulateWebhook}
                                disabled={status === 'sending'}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                {status === 'sending' ? (
                                    <Zap className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Webhook Göndər
                            </button>

                            {status === 'success' && (
                                <p className="text-center text-green-400 text-xs font-bold animate-pulse">
                                    ✅ Webhook qəbul olundu! CRM səhifəsinə baxın.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Info Area */}
                <div className="space-y-6">
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-6">
                        <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-lg">
                            <Database className="w-5 h-5" /> Necə test etməli?
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <span className="flex-none w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-400">1</span>
                                <span>Yuxarıdakı formanı doldurun və "Webhook Göndər" düyməsini sıxın.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-none w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-400">2</span>
                                <span>Yan tərəfdə <b>CRM</b> menyusuna keçin.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-none w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] font-bold text-blue-400">3</span>
                                <span>Yeni müştərinin <b>"New Messages"</b> sütununa avtomatik düşdüyünü görəcəksiniz.</span>
                            </li>
                            <li className="flex gap-3 text-slate-500 text-xs mt-4 italic border-t border-slate-800 pt-4">
                                Qeyd: Meta Cloud API-da brauzerin açıq qalmasına və ya QR kodun skan edilməsinə ehtiyac yoxdur.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
