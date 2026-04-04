import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("used"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) { setStatus("error"); return; }
      if (data?.success) { setStatus("done"); } else { setStatus("error"); }
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Verifying...</p>
          </div>
        )}
        {status === "valid" && (
          <div className="space-y-4">
            <MailX className="h-12 w-12 mx-auto text-warning" />
            <h1 className="text-xl font-bold text-foreground">Unsubscribe from emails</h1>
            <p className="text-sm text-muted-foreground">
              You'll stop receiving app emails from Stokivo. Authentication emails (password resets, etc.) will still be sent.
            </p>
            <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive" className="w-full">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Unsubscribe
            </Button>
          </div>
        )}
        {status === "done" && (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
            <h1 className="text-xl font-bold text-foreground">Unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You've been unsubscribed from app emails.</p>
          </div>
        )}
        {status === "used" && (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">Already unsubscribed</h1>
            <p className="text-sm text-muted-foreground">This email address has already been unsubscribed.</p>
          </div>
        )}
        {(status === "invalid" || status === "error") && (
          <div className="space-y-3">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Invalid link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </div>
        )}
      </div>
    </div>
  );
}
