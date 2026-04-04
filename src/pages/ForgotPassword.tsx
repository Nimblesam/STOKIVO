import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
            {sent ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Mail className="h-6 w-6 text-accent" />}
          </div>
          <CardTitle className="text-lg">{sent ? "Check Your Email" : "Forgot Password"}</CardTitle>
          <CardDescription>
            {sent
              ? `We've sent a password reset link to ${email}`
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  required
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Reset Link
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Didn't receive it? Send again
            </Button>
          )}

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-accent inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
