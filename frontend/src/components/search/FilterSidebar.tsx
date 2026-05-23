import type { AccountType } from "@/lib/mockData";

export interface Filters {
  scope: string;
  accountTypes: AccountType[];
  remoteOnly: boolean;
}

const scopes = ["Worldwide", "Country", "State", "City", "Near me"];
const types: AccountType[] = ["Individual", "Business", "NGO"];

export function FilterSidebar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const toggleType = (t: AccountType) => {
    const has = value.accountTypes.includes(t);
    onChange({ ...value, accountTypes: has ? value.accountTypes.filter((x) => x !== t) : [...value.accountTypes, t] });
  };

  return (
    <aside className="rounded-2xl border border-border bg-card p-5 space-y-6 lg:sticky lg:top-24">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Scope</h4>
        <div className="space-y-1">
          {scopes.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio" name="scope" checked={value.scope === s}
                onChange={() => onChange({ ...value, scope: s })}
                className="accent-primary"
              />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Account type</h4>
        <div className="space-y-1">
          {types.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox" checked={value.accountTypes.includes(t)}
                onChange={() => toggleType(t)} className="accent-primary"
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Availability</h4>
        <label className="flex items-center justify-between text-sm cursor-pointer">
          <span>Remote only</span>
          <input
            type="checkbox" checked={value.remoteOnly}
            onChange={(e) => onChange({ ...value, remoteOnly: e.target.checked })}
            className="accent-primary h-4 w-4"
          />
        </label>
      </div>
    </aside>
  );
}

