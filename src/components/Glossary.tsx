import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";

const terms = {
  CPM: "Cost Per Mille (Thousand Impressions). The cost to show your ad 1,000 times.",
  CTR: "Click-Through Rate. The percentage of people who see your ad and click on it.",
  CPC: "Cost Per Click. The actual cost you pay for each click.",
  MsgRate: "Message Rate. The percentage of clicks that result in a message conversation.",
  PotentialRate: "Potential Rate. The percentage of messages that become potential customers (Leads/Baskets).",
  CloseRate: "Sales Conversion Rate. The percentage of potential customers (or messages) that result in a sale.",
  AOV: "Average Order Value. The average amount spent per sale.",
  ROAS: "Return on Ad Spend. Revenue divided by Ad Spend.",
  CAC: "Customer Acquisition Cost. Total Spend divided by number of Sales.",
  CPP: "Cost Per Potential. Total Spend divided by number of Potential Customers.",
};

export function GlossaryItem({ term }: { term: keyof typeof terms }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help text-slate-400 hover:text-blue-400 transition-colors">
            <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 text-slate-100 text-xs p-2 rounded border border-slate-700 max-w-xs z-50 shadow-xl">
          <p><span className="font-bold text-blue-300">{term}:</span> {terms[term]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
