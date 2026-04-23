import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Loader2, Wifi, WifiOff, Star, RefreshCw, Trash2, Pencil, Info,
} from "lucide-react";
import { toast } from "sonner";

const LAST_READER_KEY = "stokivo_last_reader_id";
const LAST_LOCATION_KEY = "stokivo_terminal_location_id";

interface ReaderRow {
  id: string;
  label: string;
  status: string;          // "online" | "offline"
  device_type?: string;
  serial_number?: string;
  location?: string;
}

interface LocationRow {
  id: string;
  display_name: string;
  address?: { country?: string };
}

/**
 * Card Reader Manager
 * --------------------
 * Lets the merchant register, pick a default and remove their Stripe Terminal
 * smart readers (WisePOS E, S700, BBPOS WisePad 3 etc.) directly from Settings.
 *
 * This replaces the JS Terminal SDK discovery flow on web, which doesn't list
 * internet-connected smart readers. All operations go through the
 * `terminal-readers` Supabase function.
 */
export function ReaderManager() {
  const [loading, setLoading] = useState(true);
  const [readers, setReaders] = useState<ReaderRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [defaultReaderId, setDefaultReaderId] = useState<string | null>(null);
  const [showPair, setShowPair] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pair form
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [locationId, setLocationId] = useState<string>("");

  // Rename inline state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ data: rData, error: rErr }, { data: lData }] = await Promise.all([
        supabase.functions.invoke("terminal-readers", { body: { action: "list" } }),
        supabase.functions.invoke("terminal-locations"),
      ]);
      if (rErr) throw new Error(rErr.message);
      if (rData?.error) throw new Error(rData.error);
      setReaders(rData?.readers || []);
      const locs: LocationRow[] = lData?.locations || [];
      setLocations(locs);
      // Cache the first location for native Tap to Pay flow consistency.
      if (locs[0]?.id) {
        try { localStorage.setItem(LAST_LOCATION_KEY, locs[0].id); } catch { /* ignore */ }
        if (!locationId) setLocationId(locs[0].id);
      }
      try {
        const stored = localStorage.getItem(LAST_READER_KEY);
        setDefaultReaderId(stored);
      } catch { /* ignore */ }
    } catch (err: any) {
      toast.error("Couldn't load readers", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handlePair = async () => {
    if (!code.trim()) {
      toast.error("Pairing code required", { description: "On the reader screen, go to Settings → Generate pairing code." });
      return;
    }
    if (!locationId) {
      toast.error("Add a Location first", { description: "Stripe Terminal requires a Location before pairing readers." });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("terminal-readers", {
        body: {
          action: "register",
          registration_code: code.trim().replace(/\s+/g, "-").toLowerCase(),
          label: label.trim() || undefined,
          location: locationId,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Reader paired", { description: data?.reader?.label });
      // Auto-set as default if it's the first one.
      if (readers.length === 0 && data?.reader?.id) {
        try { localStorage.setItem(LAST_READER_KEY, data.reader.id); } catch { /* ignore */ }
        setDefaultReaderId(data.reader.id);
      }
      setShowPair(false);
      setCode(""); setLabel("");
      await refresh();
    } catch (err: any) {
      toast.error("Pairing failed", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  const setDefault = (id: string) => {
    try { localStorage.setItem(LAST_READER_KEY, id); } catch { /* ignore */ }
    setDefaultReaderId(id);
    toast.success("Default reader updated", {
      description: "POS will route card payments here automatically.",
    });
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("terminal-readers", {
        body: { action: "rename", reader_id: id, label: renameValue.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Reader renamed");
      setRenamingId(null);
      await refresh();
    } catch (err: any) {
      toast.error("Rename failed", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from this Stokivo account?\n\nThe reader stays paired to your Stripe account — you can re-add it later.`)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("terminal-readers", {
        body: { action: "delete", reader_id: id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (defaultReaderId === id) {
        try { localStorage.removeItem(LAST_READER_KEY); } catch { /* ignore */ }
        setDefaultReaderId(null);
      }
      toast.success("Reader removed");
      await refresh();
    } catch (err: any) {
      toast.error("Remove failed", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stokivo-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base">Card Readers</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Pair Stripe Terminal smart readers (WisePOS E, S700, BBPOS WisePad 3) so the POS can send card payments straight to them.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading || busy} className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowPair(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Pair reader
          </Button>
        </div>
      </div>

      {locations.length === 0 && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-0.5">Set up a Location first</p>
            <p>Stripe Terminal needs a physical store address before any reader can be paired. Add one in your Stripe dashboard → Terminal → Locations.</p>
          </div>
        </div>
      )}

      {loading && readers.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading readers…
        </div>
      ) : readers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          <Wifi className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No readers paired yet.</p>
          <p className="text-xs">Tap <span className="font-semibold">Pair reader</span> to add your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {readers.map((r) => {
            const online = r.status === "online";
            const isDefault = defaultReaderId === r.id;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isDefault ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  online ? "bg-emerald-500/10" : "bg-muted"
                }`}>
                  {online ? <Wifi className="h-5 w-5 text-emerald-600" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  {renamingId === r.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(r.id); if (e.key === "Escape") setRenamingId(null); }}
                      />
                      <Button size="sm" onClick={() => handleRename(r.id)} disabled={busy} className="h-8">Save</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{r.label}</p>
                        {isDefault && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1">
                            <Star className="h-2.5 w-2.5 fill-current" /> Default
                          </Badge>
                        )}
                        <Badge variant={online ? "outline" : "secondary"} className={`text-[10px] px-1.5 py-0 ${
                          online ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                        }`}>
                          {online ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.device_type?.replaceAll("_", " ") || "Reader"}
                        {r.serial_number ? ` · S/N ${r.serial_number}` : ""}
                      </p>
                    </>
                  )}
                </div>
                {renamingId !== r.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {!isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => setDefault(r.id)} className="h-8 text-xs gap-1">
                        <Star className="h-3.5 w-3.5" /> Set default
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setRenamingId(r.id); setRenameValue(r.label); }}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(r.id, r.label)}
                      disabled={busy}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pair dialog */}
      <Dialog open={showPair} onOpenChange={setShowPair}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pair a Card Reader</DialogTitle>
            <DialogDescription>
              On your reader screen, go to <span className="font-semibold">Settings → Generate pairing code</span>. Type the 3-word code below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {locations.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Pairing code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="quick-brown-fox"
                className="font-mono"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">3 words separated by hyphens, shown on the reader.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Front counter"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowPair(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handlePair} disabled={busy || !code.trim() || !locationId} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Pair reader
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
