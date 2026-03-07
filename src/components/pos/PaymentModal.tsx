import { useState, useCallback } from "react";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CreditCard, Delete, X, Loader2, Clock } from "lucide-react";
import type { Currency } from "@/lib/types";

interface Props {
  total: number;
  currency: Currency;
  onClose: () => void;
  onComplete: (payments: { method: string; amount: number }[], customerName?: string) => void;
  processing: boolean;
}

export function PaymentModal({ total, currency, onClose, onComplete, processing }: Props) {
  const [inputValue, setInputValue] = useState("0");
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [showPayLater, setShowPayLater] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;
  const isComplete = remaining === 0;

  const handleKey = useCallback((key: string) => {
    setInputValue((prev) => {
      if (key === "C") return "0";
      if (key === "⌫") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (key === "." && prev.includes(".")) return prev;
      if (key === "00" && prev === "0") return prev;
      if (prev === "0" && key !== ".") return key;
      return prev + key;
    });
  }, []);

  const applyPayment = (method: "cash" | "card") => {
    const amountMajor = parseFloat(inputValue) || 0;
    const amountMinor = Math.round(amountMajor * 100);
    if (amountMinor <= 0) return;

    const effectiveAmount = method === "card" ? Math.min(amountMinor, remaining) : amountMinor;
    setPayments((prev) => [...prev, { method, amount: effectiveAmount }]);
    setInputValue("0");
  };

  const handleComplete = () => {
    if (!isComplete) return;
    onComplete(payments);
  };

  const handlePayLater = () => {
    if (!customerName.trim()) return;
    onComplete([], customerName.trim());
  };

  const resetPayments = () => {
    setPayments([]);
    setInputValue("0");
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "00"];

  if (showPayLater) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <h3 className="font-display font-bold text-lg">Pay Later — Customer Details</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowPayLater(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
              <p className="text-2xl font-bold">{formatMoney(total, currency)}</p>
            </div>
            <div>
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-1"
                autoFocus
              />
            </div>
            <Button
              className="w-full h-14 text-lg font-bold"
              onClick={handlePayLater}
              disabled={!customerName.trim() || processing}
            >
              {processing ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><Clock className="h-5 w-5 mr-2" /> Confirm Pay Later</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h3 className="font-display font-bold text-lg">Payment</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due</p>
              <p className="font-bold text-lg">{formatMoney(total, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paid</p>
              <p className="font-bold text-lg text-accent">{formatMoney(totalPaid, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {isComplete && change > 0 ? "Change" : "Remaining"}
              </p>
              <p className={`font-bold text-lg ${isComplete && change > 0 ? "text-success" : remaining > 0 ? "text-destructive" : ""}`}>
                {isComplete && change > 0 ? formatMoney(change, currency) : formatMoney(remaining, currency)}
              </p>
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-2 py-1 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {p.method === "cash" ? <Banknote className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                    <span className="capitalize">{p.method}</span>
                  </div>
                  <span className="font-medium">{formatMoney(p.amount, currency)}</span>
                </div>
              ))}
              <button onClick={resetPayments} className="text-xs text-destructive hover:underline w-full text-center mt-1">
                Reset payments
              </button>
            </div>
          )}

          {!isComplete && (
            <>
              {/* Input display */}
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Enter amount</p>
                <p className="text-3xl font-mono font-bold tabular-nums">
                  {currency === "GBP" ? "£" : "₦"}{inputValue}
                </p>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {keys.map((k) => (
                  <Button
                    key={k}
                    variant="outline"
                    className="h-12 text-lg font-semibold"
                    onClick={() => handleKey(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10" onClick={() => handleKey("⌫")}>
                  <Delete className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button variant="outline" className="h-10" onClick={() => handleKey("C")}>
                  Clear
                </Button>
              </div>

              <Separator />

              {/* Quick amounts */}
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors px-3 py-1"
                  onClick={() => setInputValue((remaining / 100).toFixed(2))}
                >
                  Exact ({formatMoney(remaining, currency)})
                </Badge>
                {[5, 10, 20, 50].map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors px-3 py-1"
                    onClick={() => setInputValue(v.toString())}
                  >
                    {currency === "GBP" ? "£" : "₦"}{v}
                  </Badge>
                ))}
              </div>

              {/* Payment method buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-14 text-base font-semibold gap-2"
                  onClick={() => applyPayment("cash")}
                >
                  <Banknote className="h-5 w-5" /> Cash
                </Button>
                <Button
                  variant="outline"
                  className="h-14 text-base font-semibold gap-2"
                  onClick={() => applyPayment("card")}
                >
                  <CreditCard className="h-5 w-5" /> Card
                </Button>
              </div>

              {/* Pay Later */}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowPayLater(true)}
              >
                <Clock className="h-4 w-4 mr-2" /> Pay Later
              </Button>
            </>
          )}

          {/* Complete button */}
          {isComplete && (
            <Button
              className="w-full h-14 text-lg font-bold"
              onClick={handleComplete}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing…</>
              ) : (
                <>✓ Complete Sale</>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}