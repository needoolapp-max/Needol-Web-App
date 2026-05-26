import { useState } from "react";
import { Globe2, Search, SlidersHorizontal } from "lucide-react";
import { countries } from "@/lib/mockData";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  variant?: "hero" | "compact" | "skills";
  initialQuery?: string;
}

export function SearchBar({ variant = "compact", initialQuery = "" }: Props) {
  const [country, setCountry] = useState(countries[0]);
  const [q, setQ] = useState(initialQuery);
  const navigate = useNavigate();
  const isHero = variant === "hero";
  const isSkills = variant === "skills";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q } as never });
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Search Needool providers"
      className={`flex w-full items-stretch gap-1 rounded-xl border border-border bg-secondary/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur ${
        isHero ? "shadow-2xl shadow-black/20 ring-1 ring-primary/20 md:p-1.5" : ""
      }`}
    >
      {!isSkills && (
        <label className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-foreground hover:bg-muted">
          <Globe2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="sr-only">Search location</span>
          <select
            value={country.code}
            onChange={(event) => setCountry(countries.find((c) => c.code === event.target.value) ?? countries[0])}
            className="needool-select w-28 sm:w-36"
            aria-label="Search location"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search skills, services, products, and providers"
          placeholder={isSkills ? "Search skills, services, products..." : "Search skills, services, providers..."}
          className={`min-w-0 w-full bg-transparent outline-none placeholder:text-muted-foreground ${
            isHero ? "py-3.5 text-base" : "py-2.5 text-sm"
          }`}
        />
      </div>
      {isHero && (
        <button
          type="button"
          className="hidden min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted md:inline-flex"
          aria-label="Open search filters"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      )}
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90 sm:px-6"
      >
        Search
      </button>
    </form>
  );
}
