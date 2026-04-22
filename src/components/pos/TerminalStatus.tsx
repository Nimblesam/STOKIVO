import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import type { TerminalStatus as TerminalStatusType } from "@/hooks/use-terminal";

interface Props {
  status: TerminalStatusType;
  readerLabel?: string | null;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function TerminalStatus({ status, readerLabel, error, onConnect, onDisconnect }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          {status === "connected" && (
            <Badge variant="outline" className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10 cursor-pointer" onClick={onDisconnect}>
              <CreditCard className="h-3 w-3" />
              <span className="hidden sm:inline">Terminal</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </Badge>
          )}
          {status === "connecting" && (
            <Badge variant="outline" className="gap-1.5 text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="hidden sm:inline">Reconnecting…</span>
            </Badge>
          )}
          {status === "offline" && (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground/60 cursor-pointer" onClick={onConnect}>
              <Wifi className="h-3 w-3 animate-pulse" />
              <span className="hidden sm:inline">Searching readers…</span>
            </Badge>
          )}
          {status === "not_configured" && (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground/60">
              <AlertTriangle className="h-3 w-3" />
              <span className="hidden sm:inline">No Terminal</span>
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-xs space-y-1">
          {status === "connected" && (
            <>
              <p className="font-medium text-emerald-600">🟢 Terminal Connected</p>
              {readerLabel && <p className="text-muted-foreground">{readerLabel}</p>}
              <p className="text-muted-foreground">Click to disconnect</p>
            </>
          )}
          {status === "connecting" && (
            <>
              <p className="font-medium text-amber-600">🟠 Reconnecting…</p>
              <p className="text-muted-foreground">Searching for card reader</p>
            </>
          )}
          {status === "offline" && (
            <>
              <p className="font-medium text-muted-foreground">Searching for readers…</p>
              <p className="text-muted-foreground">We auto-connect any Wi-Fi or Bluetooth reader on this network. Click to scan now.</p>
              {error && <p className="text-destructive">{error}</p>}
            </>
          )}
          {status === "not_configured" && (
            <>
              <p className="font-medium text-muted-foreground">Terminal Not Set Up</p>
              <p className="text-muted-foreground">Enable Stripe Terminal in your Stripe dashboard</p>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
