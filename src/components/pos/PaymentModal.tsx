import { useState, useCallback } from "react";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote, CreditCard, Delete, X, Loader2, Clock, WifiOff,
  AlertTriangle, RotateCcw, CheckCircle2,
} from "lucide-react";
import type { Currency } from "@/lib/types";
import type { TerminalStatus } from "@/hooks/use-terminal";

interface Props {
  total: number;
  currency: Currency;
  onClose: () => void;
  onComplete: (payments: { method: string; amount: number }[], customerName?: string) => void;
  processing: boolean;
  terminalStatus: TerminalStatus;
  onTerminalPayment: (amount: number) => Promise<{ success: boolean; error?: string; paymentIntentId?: string }>;
  isTerminalCollecting: boolean;
  onCancelTerminalCollect: () => void;
  onRetryTerminal: () => void;
}

export function PaymentModal({
  total, currency, onClose, onComplete, processing,
  terminalStatus, onTerminalPayment, isTerminalCollecting,
  onCancelTerminalCollect, onRetryTerminal,
}: Props) {
  const [inputValue, setInputValue] = useState("0");
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [showPayLater, setShowPayLater] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState(false);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;
  const isComplete = remaining === 0;

  const isTerminalOnline = terminalStatus === "connected";

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

  const applyCash = () => {
    const amountMajor = parseFloat(inputValue) || 0;
    const amountMinor = Math.round(amountMajor * 100);
    if (amountMinor <= 0) return;
    setPayments((prev) => [...prev, { method: "cash", amount: amountMinor }]);
    setInputValue("0");
  };

  const handleCardPayment = async () => {
    const amountMajor = parseFloat(inputValue) || 0;
    const amountMinor = Math.round(amountMajor * 100);
    if (amountMinor <= 0) return;

    setCardError(null);
    setCardSuccess(false);

    if (!isTerminalOnline) {
      setCardError("Card reader is offline. Connect your terminal first.");
      return;
    }

    const effectiveAmount = Math.min(amountMinor, remaining);
    const result = await onTerminalPayment(effectiveAmount);

    if (result.success) {
      setCardSuccess(true);
      setPayments((prev) => [...prev, { method: "card", amount: effectiveAmount }]);
      setInputValue("0");
      setTimeout(() => setCardSuccess(false), 2000);
    } else {
      setCardError(result.error || "Payment failed. Try again.");
    }
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
    setCardError(null);
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "00"];

  // Terminal collecting overlay
  if (isTerminalCollecting) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl mb-2">Waiting for Card</h3>
              <p className="text-muted-foreground">
                Present, tap, or insert card on the reader
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Processing…</span>
            </div>
            <Button variant="outline" onClick={onCancelTerminalCollect} className="w-full">
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name" className="mt-1" autoFocus />
            </div>
            <Button className="w-full h-14 text-lg font-bold" onClick={handlePayLater}
              disabled={!customerName.trim() || processing}>
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

          {/* Card error/success feedback */}
          {cardError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{cardError}</p>
              {!isTerminalOnline && (
                <Button variant="outline" size="sm" onClick={onRetryTerminal} className="shrink-0 text-xs h-7">
                  <RotateCcw className="h-3 w-3 mr-1" /> Retry
                </Button>
              )}
              <button onClick={() => setCardError(null)} className="shrink-0">
                <X className="h-3.5 w-3.5 text-destructive/60" />
              </button>
            </div>
          )}
          {cardSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-600 font-medium">Card payment accepted!</p>
            </div>
          )}

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
                  <Button key={k} variant="outline" className="h-12 text-lg font-semibold"
                    onClick={() => handleKey(k)}>
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
                <Badge variant="secondary"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors px-3 py-1"
                  onClick={() => setInputValue((remaining / 100).toFixed(2))}>
                  Exact ({formatMoney(remaining, currency)})
                </Badge>
                {[5, 10, 20, 50].map((v) => (
                  <Badge key={v} variant="secondary"
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors px-3 py-1"
                    onClick={() => setInputValue(v.toString())}>
                    {currency === "GBP" ? "£" : "₦"}{v}
                  </Badge>
                ))}
              </div>

              {/* Payment method buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-14 text-base font-semibold gap-2"
                  onClick={applyCash}>
                  <Banknote className="h-5 w-5" /> Cash
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    className={`h-14 w-full text-base font-semibold gap-2 ${
                      !isTerminalOnline ? "opacity-60" : ""
                    }`}
                    onClick={handleCardPayment}
                    disabled={isTerminalCollecting}
                  >
                    <CreditCard className="h-5 w-5" /> Card
                    {!isTerminalOnline && <WifiOff className="h-3 w-3 text-destructive" />}
                  </Button>
                  {!isTerminalOnline && (
                    <p className="text-[10px] text-destructive text-center mt-0.5">
                      Terminal offline
                    </p>
                  )}
                </div>
              </div>

              {/* Pay Later */}
              <Button variant="secondary" className="w-full" onClick={() => setShowPayLater(true)}>
                <Clock className="h-4 w-4 mr-2" /> Pay Later
              </Button>
            </>
          )}

          {/* Complete button */}
          {isComplete && (
            <Button className="w-full h-14 text-lg font-bold" onClick={handleComplete} disabled={processing}>
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
