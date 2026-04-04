import { useStore } from "@/contexts/StoreContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";

export function StoreSwitcher() {
  const { stores, activeStoreId, canSwitchStore, switchStore, loading } = useStore();

  // Don't render if only 1 store or no switch permission
  if (loading || stores.length <= 1 || !canSwitchStore) return null;

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={activeStoreId || ""} onValueChange={switchStore}>
        <SelectTrigger className="h-8 w-[180px] text-xs border-dashed">
          <SelectValue placeholder="Select store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id} className="text-xs">
              {store.name}
              {store.is_default && (
                <span className="ml-1 text-muted-foreground">(Main)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
