import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Delete, Lock } from "lucide-react";
import stokivoLogo from "@/assets/stokivo-logo.png";
import { toast } from "sonner";

interface CashierUser {
  id: string;
  name: string;
  role: string;
}

interface CashierPinScreenProps {
  onAuthenticated: (cashier: { id: string; name: string; role: string }) => void;
}

export function CashierPinScreen({ onAuthenticated }: CashierPinScreenProps) {
  const { profile } = useAuth();
  const { activeStoreId } = useStore();
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCashier, setSelectedCashier] = useState<CashierUser | null>(null);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!profile?.company_id) return;
    const load = async () => {
      let q = supabase
        .from("cashier_users")
        .select("id, name, role")
        .eq("company_id", profile.company_id!)
        .eq("active", true)
        .order("name");
      if (activeStoreId) {
        q = q.or(`store_id.eq.${activeStoreId},store_id.is.null`);
      }
      const { data } = await q;
      setCashiers(data || []);
      setLoading(false);
    };
    load();
  }, [profile?.company_id, activeStoreId]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4 && selectedCashier) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (enteredPin: string) => {
    if (!selectedCashier || !profile?.company_id) return;
    setVerifying(true);
    try {
      const { data, error: err } = await supabase.rpc("verify_cashier_pin", {
        _company_id: profile.company_id,
        _cashier_id: selectedCashier.id,
        _pin: enteredPin,
      });
      if (err) throw err;
      if (data) {
        onAuthenticated({
          id: selectedCashier.id,
          name: selectedCashier.name,
          role: selectedCashier.role,
        });
      } else {
        setError(true);
        setPin("");
        toast.error("Incorrect PIN");
      }
    } catch {
      setError(true);
      setPin("");
      toast.error("Verification failed");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src={stokivoLogo} alt="Stokivo" className="h-12 w-12 rounded-xl animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading cashiers...</p>
        </div>
      </div>
    );
  }

  if (cashiers.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display font-bold">No Cashier Users Set Up</h2>
          <p className="text-sm text-muted-foreground">
            Ask your account owner to add cashier users in Settings → Cashier Users before using the POS.
          </p>
        </div>
      </div>
    );
  }

  // Step 1: Select cashier
  if (!selectedCashier) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center">
            <img src={stokivoLogo} alt="Stokivo" className="h-12 w-12 rounded-xl mx-auto mb-3" />
            <h2 className="text-xl font-display font-bold text-foreground">Who's on the register?</h2>
            <p className="text-sm text-muted-foreground mt-1">Select your name to sign in</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cashiers.map((c) => {
              const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCashier(c)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all group"
                >
                  <Avatar className="h-14 w-14 group-hover:ring-2 ring-primary transition-all">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-sm font-semibold truncate max-w-[100px]">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{c.role}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter PIN
  const initials = selectedCashier.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-6 animate-fade-in">
        <div className="text-center">
          <Avatar className="h-16 w-16 mx-auto mb-3">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-display font-bold">{selectedCashier.name}</h2>
          <p className="text-sm text-muted-foreground">Enter your 4-digit PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full transition-all ${
                i < pin.length
                  ? error
                    ? "bg-destructive scale-110"
                    : "bg-primary scale-110"
                  : "bg-muted border border-border"
              }`}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              className="h-14 text-xl font-semibold"
              onClick={() => handleDigit(digit)}
              disabled={verifying}
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="h-14 text-sm"
            onClick={() => {
              setSelectedCashier(null);
              setPin("");
              setError(false);
            }}
          >
            Back
          </Button>
          <Button
            variant="outline"
            className="h-14 text-xl font-semibold"
            onClick={() => handleDigit("0")}
            disabled={verifying}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-14"
            onClick={handleDelete}
            disabled={verifying}
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}