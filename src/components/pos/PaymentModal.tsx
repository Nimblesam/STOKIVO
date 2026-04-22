import { useState, useCallback, useEffect } from "react";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote, CreditCard, Delete, X, Loader2, Clock, WifiOff,
  AlertTriangle, RotateCcw, CheckCircle2, Smartphone, Hand,
} from "lucide-react";
import type { Currency } from "@/lib/types";
import type { TerminalStatus } from "@/hooks/use-terminal";

export type CardMode = "manual" | "integrated" | "tap_to_pay";

export interface PaymentLine {
  method: string;
  amount: number;
  card_mode?: CardMode;
}

interface Props {
  total: number;
  currency: Currency;
  onClose: () => void;
  onComplete: (payments: PaymentLine[], customerName?: string) => void;
  processing: boolean;
  terminalStatus: TerminalStatus;
  tapToPaySupported?: boolean;
  onTerminalPayment: (amount: number) => Promise<{ success: boolean; error?: string; paymentIntentId?: string }>;
  isTerminalCollecting: boolean;
  onCancelTerminalCollect: () => void;
  onRetryTerminal: () => void;
}

export function PaymentModal({
  total, currency, onClose, onComplete, processing,
  terminalStatus, tapToPaySupported = false, onTerminalPayment, isTerminalCollecting,
  onCancelTerminalCollect, onRetryTerminal,
}: Props) {
  const [inputValue, setInputValue] = useState("0");
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [showPayLater, setShowPayLater] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [showCardChoice, setShowCardChoice] = useState(false);
  const [showManualCard, setShowManualCard] = useState(false);
  const [pendingCardAmount, setPendingCardAmount] = useState(0);

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

  // Open card method chooser
  const openCardFlow = () => {
    const amountMajor = parseFloat(inputValue) || 0;
    let amountMinor = Math.round(amountMajor * 100);
    // Default: if user hasn't entered an amount, charge remaining
    if (amountMinor <= 0) amountMinor = remaining;
    if (amountMinor <= 0) return;

    const effectiveAmount = Math.min(amountMinor, remaining);
    setPendingCardAmount(effectiveAmount);
    setCardError(null);
    setCardSuccess(false);
    setShowCardChoice(true);
  };

  const runIntegrated = async () => {
    if (!isTerminalOnline) {
      // Soft fallback to Manual instead of leaving user stuck.
      setShowCardChoice(false);
      setShowManualCard(true);
      return;
    }
    setShowCardChoice(false);
    const result = await onTerminalPayment(pendingCardAmount);
    if (result.success) {
      setCardSuccess(true);
      setPayments((prev) => [...prev, { method: "card", amount: pendingCardAmount, card_mode: "integrated" }]);
      setInputValue("0");
      setTimeout(() => setCardSuccess(false), 2000);
    } else {
      // Terminal failed mid-flow — keep user moving with Manual.
      setCardError(result.error || "Card payment failed. You can use Manual Card instead.");
      setShowManualCard(true);
    }
  };

  const runTapToPay = async () => {
    setShowCardChoice(false);
    if (!tapToPaySupported) {
      setShowManualCard(true);
      return;
    }
    const result = await onTerminalPayment(pendingCardAmount);
    if (result.success) {
      setCardSuccess(true);
      setPayments((prev) => [...prev, { method: "card", amount: pendingCardAmount, card_mode: "tap_to_pay" }]);
      setInputValue("0");
      setTimeout(() => setCardSuccess(false), 2000);
    } else {
      setCardError(result.error || "Tap to Pay failed. Use Manual Card instead.");
      setShowManualCard(true);
    }
  };

  const openManual = () => {
    setShowCardChoice(false);
    setShowManualCard(true);
  };

  const confirmManual = () => {
    setPayments((prev) => [...prev, { method: "card", amount: pendingCardAmount, card_mode: "manual" }]);
    setInputValue("0");
    setShowManualCard(false);
    setCardSuccess(true);
    setTimeout(() => setCardSuccess(false), 2000);
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
              <p className="text-sm text-muted-foreground mt-2">
                Amount: <span className="font-bold text-foreground">{formatMoney(pendingCardAmount, currency)}</span>
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

  // Card method choice modal
  if (showCardChoice) {
    const defaultIntegrated = isTerminalOnline;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <h3 className="font-display font-bold text-lg">Choose Card Method</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowCardChoice(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-center mb-2">
              <p className="text-xs text-muted-foreground mb-1">Charging</p>
              <p className="text-3xl font-bold">{formatMoney(pendingCardAmount, currency)}</p>
            </div>

            {/* Integrated */}
            <button
              onClick={runIntegrated}
              disabled={!isTerminalOnline}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                defaultIntegrated
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">Send to Card Machine</p>
                    {defaultIntegrated && <Badge variant="default" className="text-[10px] px-1.5 py-0">Recommended</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isTerminalOnline
                      ? "Amount sent automatically to your connected terminal."
                      : "No terminal connected. Connect one to use this option."}
                  </p>
                </div>
              </div>
            </button>

            {/* Manual */}
            <button
              onClick={openManual}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                !defaultIntegrated
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Hand className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">Manual Card Payment</p>
                    {!defaultIntegrated && <Badge variant="default" className="text-[10px] px-1.5 py-0">Recommended</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the amount on your external card machine, then confirm here.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Manual card confirmation modal
  if (showManualCard) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-md overflow-hidden max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b bg-muted/30 sticky top-0 bg-card z-10">
            <h3 className="font-display font-bold text-base sm:text-lg">Manual Card Payment</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowManualCard(false)} className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-center">
            <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Hand className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Please enter on your card machine</p>
              <p className="text-2xl sm:text-4xl font-bold tabular-nums break-words">{formatMoney(pendingCardAmount, currency)}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-left text-xs text-muted-foreground space-y-1">
              <p>1. Enter the amount above on your external card machine</p>
              <p>2. Have the customer tap, insert, or swipe their card</p>
              <p>3. Wait for the machine to confirm approval</p>
              <p>4. Tap <span className="font-semibold text-foreground">Confirm Payment</span> below</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={confirmManual} className="font-semibold h-12 text-base w-full">
                <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Confirm Payment</span>
              </Button>
              <Button variant="outline" onClick={() => setShowManualCard(false)} className="h-10 w-full">
                Cancel
              </Button>
            </div>
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-md overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header — sticky */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0">
          <h3 className="font-display font-bold text-lg">Payment</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Amount summary — sticky inside scroll container so it stays visible */}
        <div className="border-b bg-card shrink-0 px-4 py-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Due</p>
              <p className="font-bold text-base sm:text-lg tabular-nums">{formatMoney(total, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Paid</p>
              <p className="font-bold text-base sm:text-lg text-accent tabular-nums">{formatMoney(totalPaid, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {isComplete && change > 0 ? "Change" : "Remaining"}
              </p>
              <p className={`font-bold text-base sm:text-lg tabular-nums ${isComplete && change > 0 ? "text-success" : remaining > 0 ? "text-destructive" : ""}`}>
                {isComplete && change > 0 ? formatMoney(change, currency) : formatMoney(remaining, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable middle: alerts, history, keypad */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
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
                    {p.card_mode && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{p.card_mode}</Badge>
                    )}
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
                <p className="text-2xl sm:text-3xl font-mono font-bold tabular-nums">
                  {currency === "GBP" ? "£" : "₦"}{inputValue}
                </p>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {keys.map((k) => (
                  <Button key={k} variant="outline" className="h-11 text-base font-semibold"
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
            </>
          )}
        </div>

        {/* Sticky footer — payment method buttons OR complete sale */}
        <div className="border-t bg-card px-4 py-3 shrink-0 space-y-2">
          {!isComplete ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 text-sm font-semibold gap-2"
                  onClick={applyCash}>
                  <Banknote className="h-4 w-4" /> Cash
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full text-sm font-semibold gap-2"
                  onClick={openCardFlow}
                >
                  <CreditCard className="h-4 w-4" /> Card
                  {!isTerminalOnline && <WifiOff className="h-3 w-3 text-muted-foreground" />}
                </Button>
              </div>
              <Button variant="secondary" className="w-full h-10" onClick={() => setShowPayLater(true)}>
                <Clock className="h-4 w-4 mr-2" /> Pay Later
              </Button>
            </>
          ) : (
            <Button className="w-full h-12 text-base font-bold" onClick={handleComplete} disabled={processing}>
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
