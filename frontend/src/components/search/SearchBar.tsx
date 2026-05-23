import { useState } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { countries } from "@/lib/mockData";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";

const scopes = ["Worldwide", "Country", "State", "City", "Near me"] as const;
type Scope = (typeof scopes)[number];

interface Props {
  variant?: "hero" | "compact" | "skills";
  initialQuery?: string;
}

export function SearchBar({ variant = "compact", initialQuery = "" }: Props) {
  const [scope, setScope] = useState<Scope>("Worldwide");
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
      className={`flex w-full items-stretch gap-1 rounded-lg border border-border bg-secondary p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        isHero ? "md:p-1.5 shadow-2xl shadow-black/20" : ""
      }`}
    >
      {!isSkills && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden sm:flex items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{scope}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {scopes.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setScope(s)}>{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 text-sm hover:bg-muted">
              <span className="text-lg leading-none">{country.flag}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {countries.map((c) => (
                <DropdownMenuItem key={c.code} onSelect={() => setCountry(c)}>
                  <span className="mr-2">{c.flag}</span> {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      <div className="flex flex-1 items-center gap-2 rounded-md px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isSkills ? "Search skills, services, products…" : "Search skills, services, providers…"}
          className={`w-full bg-transparent outline-none placeholder:text-muted-foreground ${
            isHero ? "py-3.5 text-base" : "py-2.5 text-sm"
          }`}
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-primary px-4 sm:px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  );
}
