import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ShieldCheck, Shield, Loader2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function TwoFactorSetup() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        const verified = data.totp.filter(f => f.status === "verified");
        setMfaEnabled(verified.length > 0);
        if (verified.length > 0) setFactorId(verified[0].id);
      }
    } catch {}
    setLoading(false);
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App", issuer: "Stokivo" });
      if (error) throw error;
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setShowEnroll(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to start 2FA enrollment");
    }
    setEnrolling(false);
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) { toast.error("Enter a 6-digit code"); return; }
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verifyCode });
      if (vErr) throw vErr;
      toast.success("2FA enabled successfully!", { description: "Your account is now protected with two-factor authentication." });
      setMfaEnabled(true);
      setShowEnroll(false);
      setVerifyCode("");
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    }
    setVerifying(false);
  };

  const handleUnenroll = async () => {
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("2FA has been disabled");
      setMfaEnabled(false);
      setFactorId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    }
    setUnenrolling(false);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${mfaEnabled ? "bg-success/10" : "bg-warning/10"}`}>
            {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-success" /> : <Shield className="h-5 w-5 text-warning" />}
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground">Two-Factor Authentication</h4>
            <p className="text-sm text-muted-foreground">
              {mfaEnabled ? "Your account is secured with 2FA" : "Add an extra layer of security to your account"}
            </p>
          </div>
        </div>
        <Badge className={`${mfaEnabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"} border-0`}>
          {mfaEnabled ? "Enabled" : "Not Set Up"}
        </Badge>
      </div>

      {!mfaEnabled ? (
        <div className="p-4 rounded-lg bg-warning/5 border border-warning/10 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              We strongly recommend enabling 2FA to protect your account. Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
            </p>
          </div>
          <Button onClick={handleEnroll} disabled={enrolling} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Set Up 2FA Now
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm text-muted-foreground">Authenticator app connected</span>
          <Button variant="outline" size="sm" className="ml-auto text-destructive" onClick={handleUnenroll} disabled={unenrolling}>
            {unenrolling ? "Disabling..." : "Disable 2FA"}
          </Button>
        </div>
      )}

      {/* Enrollment Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>Scan the QR code below with your authenticator app</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrUri && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Or enter this secret manually:</Label>
              <div className="flex gap-2 mt-1">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(secret); toast.success("Copied!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Enter 6-digit verification code</Label>
              <Input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" className="mt-1 text-center font-mono text-lg tracking-widest" maxLength={6} />
            </div>
            <Button onClick={handleVerify} className="w-full bg-accent text-accent-foreground" disabled={verifying || verifyCode.length !== 6}>
              {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</> : "Verify & Enable 2FA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Reminder banner for users who haven't set up 2FA */
export function TwoFactorReminder({ onDismiss }: { onDismiss?: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("2fa_reminder_dismissed");
    if (dismissed) return;
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (data && data.totp.filter(f => f.status === "verified").length === 0) {
        setShow(true);
      }
    });
  }, []);

  if (!show) return null;

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-3 mb-4">
      <Shield className="h-5 w-5 text-warning shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Secure your account with 2FA</p>
        <p className="text-xs text-muted-foreground">Go to Settings → Security to set up two-factor authentication</p>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => {
        sessionStorage.setItem("2fa_reminder_dismissed", "1");
        setShow(false);
        onDismiss?.();
      }}>Dismiss</Button>
    </div>
  );
}
