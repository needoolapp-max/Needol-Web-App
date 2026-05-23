import { Lock } from "lucide-react";
import type { ReactNode } from "react";

export function LockedField({ label, children, locked }: { label: string; children?: ReactNode; locked: boolean }) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Available to active members. Activate your account to unlock.</p>
    </div>
  );
}
