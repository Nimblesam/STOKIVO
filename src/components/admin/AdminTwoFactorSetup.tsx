import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Shield, Loader2, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin-only TOTP 2FA setup. Identical to the merchant flow but styled for the
 * Admin Portal and labelled so the issuer shows up in authenticator apps as
 * "Stokivo Admin".
 */
export function AdminTwoFactorSetup() {
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

  useEffect(() => { void checkMfaStatus(); }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        const verified = data.totp.filter((f) => f.status === "verified");
        setMfaEnabled(verified.length > 0);
        if (verified.length > 0) setFactorId(verified[0].id);
      }
    } catch {}
    setLoading(false);
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Clean up any unverified factors first so enrollment doesn't collide.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      if (existing) {
        for (const f of existing.totp) {
          if (f.status !== "verified") {
            await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Stokivo Admin ${Date.now()}`,
        issuer: "Stokivo Admin",
      });
      if (error) throw error;
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setShowEnroll(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start 2FA enrollment");
    }
    setEnrolling(false);
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) { toast.error("Enter a 6-digit code"); return; }
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (vErr) throw vErr;
      toast.success("2FA enabled", { description: "Admin account protected with authenticator code." });
      setMfaEnabled(true);
      setShowEnroll(false);
      setVerifyCode("");
    } catch (err: any) {
      toast.error(err?.message || "Invalid code. Please try again.");
    }
    setVerifying(false);
  };

  const handleUnenroll = async () => {
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("2FA disabled");
      setMfaEnabled(false);
      setFactorId("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to disable 2FA");
    }
    setUnenrolling(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-destructive" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Required layer for platform administrators. Protects against credential theft.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${mfaEnabled ? "bg-success/10" : "bg-warning/10"}`}>
                  {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-success" /> : <Shield className="h-5 w-5 text-warning" />}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {mfaEnabled ? "Enabled" : "Not set up"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mfaEnabled ? "Authenticator app linked" : "Recommended for all admin users"}
                  </p>
                </div>
              </div>
              <Badge className={`${mfaEnabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"} border-0`}>
                {mfaEnabled ? "Enabled" : "Off"}
              </Badge>
            </div>

            {!mfaEnabled ? (
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/10 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Use Google Authenticator, Authy, or 1Password. Once enabled you will be prompted for a 6-digit code every sign-in.
                  </p>
                </div>
                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                >
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Set Up 2FA
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Authenticator connected</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={unenrolling}
                    >
                      {unenrolling ? "Disabling..." : "Disable 2FA"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The admin portal will no longer require a verification code after sign-in. You can re-enable 2FA at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Enabled</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUnenroll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Disable
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Enrollment dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Up Admin 2FA</DialogTitle>
            <DialogDescription>Scan the QR code with your authenticator app.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrUri && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Or enter secret manually:</Label>
              <div className="flex gap-2 mt-1">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success("Copied!"); }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Enter 6-digit verification code</Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mt-1 text-center font-mono text-lg tracking-widest"
                maxLength={6}
                autoFocus
              />
            </div>
            <Button
              onClick={handleVerify}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={verifying || verifyCode.length !== 6}
            >
              {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : "Verify & Enable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
