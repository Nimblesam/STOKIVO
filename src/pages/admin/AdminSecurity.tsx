import { AdminTwoFactorSetup } from "@/components/admin/AdminTwoFactorSetup";
import { ShieldCheck } from "lucide-react";

export default function AdminSecurity() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-destructive" /> Admin Security
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage multi-factor authentication for your admin account.
        </p>
      </div>
      <AdminTwoFactorSetup />
    </div>
  );
}
