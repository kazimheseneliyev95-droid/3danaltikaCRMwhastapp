import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Badge } from './ui/Badge';
import { formatCurrency, formatNumber, formatPercent, cn } from '../lib/utils';
import { calculateConfidenceInterval, calculateDecomposition } from '../lib/statistics';
import { 
  ArrowRight, Target, TrendingUp, DollarSign, MessageSquare, 
  MousePointer, ShoppingCart, RefreshCw, UserPlus, SlidersHorizontal, 
  ChevronDown, ChevronUp, Save, Trash2, RotateCcw, BarChart3
} from 'lucide-react';
import { HealthPanel } from './HealthPanel';

// Type for Saved Scenario
interface Scenario {
  id: string;
  name: string;
  overrides: {
    cpc: string;
    msgRate: string;
    potRate: string;
    closeRate: string;
    budget: number;
  };
}

export default function FunnelSimulator() {
  // --- REAL INPUTS ---
  const [spend, setSpend] = useState<number>(1.4);
  const [clicks, setClicks] = useState<number>(45);
  const [cpm, setCpm] = useState<number>(0.87);
  const [ctr, setCtr] = useState<number>(1.5);
  const [messages, setMessages] = useState<number>(6);
  const [potential, setPotential] = useState<number>(3);
  const [sales, setSales] = useState<number>(0);
  const [aov, setAov] = useState<number>(35);
  const [assumedCloseRate, setAssumedCloseRate] = useState<number>(15);

  // --- BENCHMARK INPUTS (7-Day Avg) ---
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [benchCpc, setBenchCpc] = useState<number>(0.03);
  const [benchMsgRate, setBenchMsgRate] = useState<number>(12);
  const [benchCloseRate, setBenchCloseRate] = useState<number>(10);
  const [benchRoas, setBenchRoas] = useState<number>(2.5);

  // --- SIM INPUTS ---
  const [simBudget, setSimBudget] = useState<number>(3);
  const [overrideCpc, setOverrideCpc] = useState<string>("");
  const [overrideMsgRate, setOverrideMsgRate] = useState<string>("");
  const [overridePotentialRate, setOverridePotentialRate] = useState<string>("");
  const [overrideCloseRate, setOverrideCloseRate] = useState<string>("");

  // --- SCENARIOS ---
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  // --- TARGET INPUTS ---
  const [targetSales, setTargetSales] = useState<number>(10);

  // --- CALCULATIONS: REAL ---
  const effectiveClicks = useMemo(() => {
    if (clicks > 0) return clicks;
    if (cpm <= 0) return 0;
    const impressions = (spend / cpm) * 1000;
    return Math.round(impressions * (ctr / 100));
  }, [clicks, spend, cpm, ctr]);

  const realCpc = effectiveClicks > 0 ? spend / effectiveClicks : 0;
  const realMsgRate = effectiveClicks > 0 ? (messages / effectiveClicks) * 100 : 0;
  const realPotentialRate = messages > 0 ? (potential / messages) * 100 : 0;
  
  const hasPotentialData = potential > 0;
  
  // Logic Fix: If we have potential data, Close Rate is Sales/Potential.
  // If we don't, it's Sales/Messages.
  const realCloseRate = useMemo(() => {
    if (sales === 0 && !hasPotentialData) return assumedCloseRate;
    if (hasPotentialData) return potential > 0 ? (sales / potential) * 100 : 0;
    return messages > 0 ? (sales / messages) * 100 : 0;
  }, [sales, potential, messages, assumedCloseRate, hasPotentialData]);

  const realRoas = spend > 0 ? (sales * aov) / spend : 0;

  // --- CALCULATIONS: STATISTICS & RANGES (Wilson Score) ---
  const [msgRateLow, msgRateHigh] = calculateConfidenceInterval(messages, effectiveClicks);
  
  // For Close Rate range, base it on the step immediately preceding sales
  const [closeRateLow, closeRateHigh] = hasPotentialData 
    ? calculateConfidenceInterval(sales, potential)
    : calculateConfidenceInterval(sales, messages);

  // --- CALCULATIONS: SIMULATION ---
  const simCpc = overrideCpc ? parseFloat(overrideCpc) : realCpc;
  const simMsgRate = overrideMsgRate ? parseFloat(overrideMsgRate) : realMsgRate;
  const simPotentialRate = overridePotentialRate ? parseFloat(overridePotentialRate) : realPotentialRate;
  
  // Logic Fix: If user overrides Potential Rate but didn't have potential data before,
  // we must ensure the Close Rate makes sense. 
  // If Real Data was Msg->Sale (e.g. 5%), but Sim is Msg->Pot->Sale, 
  // the Close Rate (Pot->Sale) should likely be higher than Msg->Sale.
  // For now, we use the override or the real rate, but the user should be aware.
  const simCloseRate = overrideCloseRate ? parseFloat(overrideCloseRate) : realCloseRate;

  // Calculate Sim Flow
  const simClicks = simCpc > 0 ? Math.floor(simBudget / simCpc) : 0;
  const simMessages = Math.floor(simClicks * (simMsgRate / 100));
  
  // Determine if simulation uses Potential step
  const simHasPotential = hasPotentialData || overridePotentialRate !== "";
  
  const simPotential = simHasPotential 
    ? Math.floor(simMessages * (simPotentialRate / 100)) 
    : 0;

  const simSales = simHasPotential
    ? Math.floor(simPotential * (simCloseRate / 100))
    : Math.floor(simMessages * (simCloseRate / 100));

  // Ranges for Simulation (using relative deviation from real data stats)
  // We apply the same % uncertainty from real data to the sim data
  const msgRateUncertainty = realMsgRate > 0 ? (realMsgRate - msgRateLow) / realMsgRate : 0.2;
  const closeRateUncertainty = realCloseRate > 0 ? (realCloseRate - closeRateLow) / realCloseRate : 0.2;

  const simMessagesLow = Math.floor(simClicks * ((simMsgRate * (1 - msgRateUncertainty)) / 100));
  const simMessagesHigh = Math.ceil(simClicks * ((simMsgRate * (1 + msgRateUncertainty)) / 100));
  
  const simSalesLow = Math.floor(simSales * (1 - closeRateUncertainty));
  const simSalesHigh = Math.ceil(simSales * (1 + closeRateUncertainty));

  const simRevenue = simSales * aov;
  const simRoas = simBudget > 0 ? simRevenue / simBudget : 0;
  const simCac = simSales > 0 ? simBudget / simSales : 0;

  // --- ACTIONS ---
  const handleResetOverrides = () => {
    setOverrideCpc("");
    setOverrideMsgRate("");
    setOverridePotentialRate("");
    setOverrideCloseRate("");
  };

  const handleSaveScenario = () => {
    if (!scenarioName) return;
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName,
      overrides: {
        cpc: overrideCpc,
        msgRate: overrideMsgRate,
        potRate: overridePotentialRate,
        closeRate: overrideCloseRate,
        budget: simBudget
      }
    };
    setScenarios([...scenarios, newScenario]);
    setScenarioName("");
  };

  const handleLoadScenario = (s: Scenario) => {
    setOverrideCpc(s.overrides.cpc);
    setOverrideMsgRate(s.overrides.msgRate);
    setOverridePotentialRate(s.overrides.potRate);
    setOverrideCloseRate(s.overrides.closeRate);
    setSimBudget(s.overrides.budget);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  // --- DECOMPOSITION ---
  const decomposition = useMemo(() => {
    if (!showBenchmarks) return null;
    return calculateDecomposition(
      { spend, cpc: realCpc, msgRate: realMsgRate, closeRate: realCloseRate },
      { spend, cpc: benchCpc, msgRate: benchMsgRate, closeRate: benchCloseRate }
    );
  }, [showBenchmarks, spend, realCpc, realMsgRate, realCloseRate, benchCpc, benchMsgRate, benchCloseRate]);

  // --- TARGET CALCULATOR ---
  const reqPotential = simHasPotential
    ? Math.ceil(targetSales / (simCloseRate / 100)) : 0;
  const reqMessages = simHasPotential
    ? Math.ceil(reqPotential / (simPotentialRate / 100))
    : Math.ceil(targetSales / (simCloseRate / 100));
  const reqClicks = Math.ceil(reqMessages / (simMsgRate / 100));
  const reqBudget = reqClicks * simCpc;

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto font-sans text-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            Funnel Simulator <Badge variant="secondary" className="ml-2">Pro V2</Badge>
          </h1>
          <p className="text-slate-400 mt-1">Advanced forecasting with confidence intervals & health signals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: REAL DATA + BENCHMARKS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-l-4 border-l-yellow-500 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Real Data Inputs</span>
                <button 
                  onClick={() => setShowBenchmarks(!showBenchmarks)}
                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showBenchmarks ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                  {showBenchmarks ? 'Hide Benchmarks' : 'Set Benchmarks'}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Benchmark Section */}
              {showBenchmarks && (
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700 mb-4 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase">7-Day Averages (For Alerts)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">Avg CPC</Label>
                      <Input type="number" value={benchCpc} onChange={e => setBenchCpc(parseFloat(e.target.value))} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Avg Msg%</Label>
                      <Input type="number" value={benchMsgRate} onChange={e => setBenchMsgRate(parseFloat(e.target.value))} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Avg Close%</Label>
                      <Input type="number" value={benchCloseRate} onChange={e => setBenchCloseRate(parseFloat(e.target.value))} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Avg ROAS</Label>
                      <Input type="number" value={benchRoas} onChange={e => setBenchRoas(parseFloat(e.target.value))} className="h-7 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Main Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spend ($)</Label>
                  <Input type="number" value={spend} onChange={(e) => setSpend(parseFloat(e.target.value) || 0)} className="border-yellow-500/20 focus:border-yellow-500"/>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Clicks</Label>
                    <span className="text-[10px] text-slate-500">{clicks === 0 ? 'Auto' : 'Manual'}</span>
                  </div>
                  <Input type="number" value={clicks} onChange={(e) => setClicks(parseFloat(e.target.value) || 0)} placeholder="0 for Auto" className="border-yellow-500/20 focus:border-yellow-500"/>
                </div>
              </div>

              {clicks === 0 && (
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPM ($)</Label>
                      <Input type="number" value={cpm} onChange={(e) => setCpm(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label>CTR (%)</Label>
                      <Input type="number" value={ctr} onChange={(e) => setCtr(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Messages</Label>
                  <Input type="number" value={messages} onChange={(e) => setMessages(parseFloat(e.target.value) || 0)} className="border-yellow-500/20 focus:border-yellow-500"/>
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-300">Potential</Label>
                  <Input type="number" value={potential} onChange={(e) => setPotential(parseFloat(e.target.value) || 0)} className="border-purple-500/30 focus:border-purple-500 bg-purple-500/5"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sales</Label>
                  <Input type="number" value={sales} onChange={(e) => setSales(parseFloat(e.target.value) || 0)} className="border-yellow-500/20 focus:border-yellow-500"/>
                </div>
                <div className="space-y-2">
                  <Label>AOV ($)</Label>
                  <Input type="number" value={aov} onChange={(e) => setAov(parseFloat(e.target.value) || 0)} className="border-yellow-500/20 focus:border-yellow-500"/>
                </div>
              </div>

              {/* Real Metrics with Confidence Ranges */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Metric Reality Check</h4>
                <div className="space-y-3">
                  <MetricRow label="CPC" value={formatCurrency(realCpc)} sub={`Est: ${formatCurrency(realCpc)}`} />
                  <MetricRow 
                    label="Msg Rate" 
                    value={`${formatNumber(realMsgRate, 1)}%`} 
                    sub={`Range: ${formatNumber(msgRateLow, 1)}% - ${formatNumber(msgRateHigh, 1)}%`}
                    isRate
                  />
                  <MetricRow 
                    label="Close Rate" 
                    value={`${formatNumber(realCloseRate, 1)}%`} 
                    sub={`Range: ${formatNumber(closeRateLow, 1)}% - ${formatNumber(closeRateHigh, 1)}%`}
                    isRate
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* CENTER/RIGHT: SIMULATION & RESULTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Health & Alerts Panel */}
          {showBenchmarks && (
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Funnel Health & Impact Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HealthPanel 
                  metrics={{
                    cpc: { label: 'Traffic Cost (CPC)', current: realCpc, benchmark: benchCpc, format: 'currency', inverse: true },
                    msgRate: { label: 'Intent (Msg%)', current: realMsgRate, benchmark: benchMsgRate, format: 'percent' },
                    closeRate: { label: 'Conversion (Close%)', current: realCloseRate, benchmark: benchCloseRate, format: 'percent' },
                    roas: { label: 'Outcome (ROAS)', current: realRoas, benchmark: benchRoas, format: 'number' }
                  }}
                  dataQuality={{ clicks: effectiveClicks, messages: messages }}
                />
                
                {decomposition && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h5 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Sales Impact Analysis (Why did sales change?)</h5>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <ImpactBadge label="CPC Impact" value={decomposition.cpc} />
                      <ImpactBadge label="Msg% Impact" value={decomposition.msgRate} />
                      <ImpactBadge label="Close% Impact" value={decomposition.closeRate} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Simulation Controls */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  Pro Simulation
                </CardTitle>
                <div className="flex gap-2">
                  <button onClick={handleResetOverrides} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-1 space-y-2">
                  <Label className="text-blue-300">Sim Budget ($)</Label>
                  <Input type="number" value={simBudget} onChange={(e) => setSimBudget(parseFloat(e.target.value) || 0)} className="border-blue-500/50 focus:border-blue-500 text-lg font-semibold"/>
                </div>
                
                <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <OverrideInput label="Override CPC" placeholder={formatNumber(realCpc, 2)} value={overrideCpc} onChange={setOverrideCpc} />
                  <OverrideInput label="Override Msg%" placeholder={formatNumber(realMsgRate, 1)} value={overrideMsgRate} onChange={setOverrideMsgRate} />
                  <OverrideInput label="Override Pot%" placeholder={formatNumber(realPotentialRate, 1)} value={overridePotentialRate} onChange={setOverridePotentialRate} color="purple" />
                  <OverrideInput label="Override Close%" placeholder={formatNumber(realCloseRate, 1)} value={overrideCloseRate} onChange={setOverrideCloseRate} color="green" />
                </div>
              </div>

              {/* Scenario Manager */}
              <div className="pt-4 border-t border-slate-800/50 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Scenario Name (e.g. Best Case)" 
                    value={scenarioName} 
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="h-8 w-48 text-xs"
                  />
                  <button onClick={handleSaveScenario} disabled={!scenarioName} className="h-8 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded flex items-center gap-1 transition-colors">
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
                
                {scenarios.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center pl-2 border-l border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase">Saved:</span>
                    {scenarios.map(s => (
                      <div key={s.id} className="group flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
                        <button onClick={() => handleLoadScenario(s)} className="text-xs text-slate-300 hover:text-white">{s.name}</button>
                        <button onClick={() => handleDeleteScenario(s.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visual Funnel Bar */}
          <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-900 border border-slate-800">
            <div className="h-full bg-slate-700" style={{ width: '100%' }} title="Clicks" />
            <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (simMessages / (simClicks || 1)) * 100)}%` }} title="Messages" />
            {simHasPotential && (
              <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (simPotential / (simClicks || 1)) * 100)}%` }} title="Potential" />
            )}
            <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (simSales / (simClicks || 1)) * 100)}%` }} title="Sales" />
          </div>

          {/* Simulation Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <ResultCard 
              icon={<MousePointer className="w-4 h-4 text-slate-400" />}
              label="Sim Clicks"
              value={formatNumber(simClicks)}
              subValue={`@ ${formatCurrency(simCpc)}`}
            />
            <ResultCard 
              icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
              label="Sim Messages"
              value={formatNumber(simMessages)}
              range={`${simMessagesLow} – ${simMessagesHigh}`}
              subValue={`Cost: ${formatCurrency(simBudget/simMessages || 0)}`}
            />
            <ResultCard 
              icon={<UserPlus className="w-4 h-4 text-purple-400" />}
              label="Sim Potential"
              value={formatNumber(simPotential)}
              subValue="Leads / Baskets"
              highlightColor="purple"
              disabled={!simHasPotential}
            />
            <ResultCard 
              icon={<ShoppingCart className="w-4 h-4 text-green-400" />}
              label="Sim Sales"
              value={formatNumber(simSales)}
              range={`${simSalesLow} – ${simSalesHigh}`}
              subValue={`CAC: ${formatCurrency(simCac)}`}
              highlightColor="green"
            />
            <ResultCard 
              icon={<DollarSign className="w-4 h-4 text-yellow-400" />}
              label="Revenue"
              value={formatCurrency(simRevenue)}
              subValue={`ROAS: ${formatNumber(simRoas, 2)}x`}
              highlightColor="yellow"
            />
          </div>

          {/* Target Reverse Calculator */}
          <Card className="border-t border-slate-800 bg-slate-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-300">
                <Target className="w-4 h-4" />
                Target Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-sm text-slate-400 whitespace-nowrap">I want</span>
                  <div className="relative w-20">
                    <Input type="number" value={targetSales} onChange={(e) => setTargetSales(parseFloat(e.target.value) || 0)} className="h-8 text-center pr-1"/>
                  </div>
                  <span className="text-sm text-slate-400 whitespace-nowrap">sales</span>
                </div>
                <ArrowRight className="hidden md:block text-slate-600" />
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <TargetResult label="Budget" value={formatCurrency(reqBudget)} />
                  <TargetResult label="Clicks" value={formatNumber(reqClicks)} />
                  <TargetResult label="Messages" value={formatNumber(reqMessages)} />
                  {simHasPotential && (
                    <TargetResult label="Potential" value={formatNumber(reqPotential)} color="purple" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function MetricRow({ label, value, sub, isRate }: { label: string, value: string, sub: string, isRate?: boolean }) {
  return (
    <div className="flex justify-between items-center p-2 rounded hover:bg-slate-900/50 transition-colors">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="text-right">
        <div className="font-mono font-medium text-slate-200">{value}</div>
        <div className="text-[10px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function OverrideInput({ label, placeholder, value, onChange, color = "slate" }: any) {
  const borderColor = color === 'purple' ? 'border-purple-500/20 focus:border-purple-500' : 
                      color === 'green' ? 'border-green-500/20 focus:border-green-500' : '';
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1 truncate text-xs">{label}</Label>
      <Input type="number" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cn("placeholder:text-slate-600 text-xs", borderColor)} />
    </div>
  );
}

function ResultCard({ icon, label, value, subValue, range, highlightColor, disabled }: any) {
  const getHighlightClass = () => {
    if (disabled) return "bg-slate-950/50 border-slate-800/50 opacity-50";
    switch(highlightColor) {
      case 'purple': return "bg-purple-950/20 border-purple-500/30";
      case 'green': return "bg-green-950/20 border-green-500/30";
      case 'yellow': return "bg-yellow-950/20 border-yellow-500/30";
      default: return "bg-slate-950 border-slate-800";
    }
  }

  return (
    <div className={cn("p-3 rounded-xl border flex flex-col justify-between h-32 transition-all duration-300", getHighlightClass())}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div>
        <div className={cn("text-xl font-bold text-slate-200")}>{value}</div>
        {range && <div className="text-[10px] text-slate-400 font-mono mt-0.5">Range: {range}</div>}
        <div className="text-[10px] text-slate-500 mt-1 font-mono">{subValue}</div>
      </div>
    </div>
  );
}

function TargetResult({ label, value, color }: any) {
  return (
    <div className="text-center">
      <div className={cn("text-[10px] uppercase tracking-wider mb-1", color === 'purple' ? "text-purple-400" : "text-slate-500")}>{label}</div>
      <div className={cn("text-lg font-bold", color === 'purple' ? "text-purple-200" : "text-white")}>{value}</div>
    </div>
  );
}

function ImpactBadge({ label, value }: { label: string, value: number }) {
  const isPositive = value > 0;
  // For Impact: Positive value means it HELPED sales (Good). Negative means it HURT sales (Bad).
  const colorClass = isPositive ? "text-green-400 bg-green-950/30" : "text-red-400 bg-red-950/30";
  return (
    <div className={cn("px-2 py-1 rounded flex items-center gap-1 border border-transparent hover:border-slate-700 transition-colors", colorClass)}>
      <span>{label}:</span>
      <span className="font-mono font-bold">{isPositive ? '+' : ''}{formatNumber(value, 1)}%</span>
    </div>
  );
}
