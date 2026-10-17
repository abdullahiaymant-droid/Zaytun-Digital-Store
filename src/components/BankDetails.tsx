import { Copy } from "lucide-react";
import { toast } from "sonner";
import { BANK } from "@/lib/payment";
import { naira } from "@/lib/format";

export function BankDetails({ amount, reference }: { amount: number; reference: string }) {
  const copy = (v: string, label: string) => {
    navigator.clipboard?.writeText(v);
    toast.success(`${label} copied`);
  };
  const row = "flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5";
  return (
    <div className="space-y-2 text-sm">
      <div className={row}><span className="text-muted-foreground">Bank</span><b>{BANK.bank}</b></div>
      <div className={row}>
        <span className="text-muted-foreground">Account number</span>
        <button type="button" onClick={() => copy(BANK.number, "Account number")} className="flex items-center gap-2 text-lg font-bold tracking-wider text-primary">
          {BANK.number} <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className={row}><span className="text-muted-foreground">Account name</span><b className="text-right">{BANK.name}</b></div>
      <div className={row}>
        <span className="text-muted-foreground">Amount</span>
        <button type="button" onClick={() => copy(String(amount), "Amount")} className="flex items-center gap-2 font-bold">
          {naira(amount)} <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className={row}>
        <span className="text-muted-foreground">Narration</span>
        <button type="button" onClick={() => copy(reference, "Reference")} className="flex items-center gap-2 font-bold">
          {reference} <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
