import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Phase 10-2 — Editorial Trust Ledger searchable Combobox.
 *
 * Type to filter (no scrolling to USA from the end of an alphabetical list).
 * Internally manages its own search + open state — the parent form does NOT
 * re-render on per-keystroke filtering, which is critical for the freeze
 * defense documented in SignupDemographicForm.tsx (uncontrolled-input
 * pattern: the form reads values via FormData on submit, never on every
 * change).
 *
 * The committed value is written into a hidden <input> so FormData picks it
 * up the same way it would for a native <input> or <select>.
 */
export type ComboboxOption = {
  /** Stable id submitted as the form value. */
  value: string;
  /** Human label shown in the trigger button and the dropdown row. */
  label: string;
};

export type ComboboxProps = {
  /** Hidden <input name> the parent form reads. */
  name: string;
  options: readonly ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional ID for the trigger button (label[for] association). */
  id?: string;
  /** Data-test hook for Playwright specs. */
  "data-test"?: string;
  /** Called whenever the committed value changes. */
  onChange?: (value: string) => void;
};

export function Combobox({
  name,
  options,
  defaultValue = "",
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  required = false,
  disabled = false,
  className,
  id,
  "data-test": dataTest,
  onChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);

  // If the parent changes defaultValue after mount (e.g. on country change
  // resetting the state combobox), keep our committed value in sync.
  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? "";

  function commit(next: string) {
    setValue(next);
    setOpen(false);
    onChange?.(next);
  }

  return (
    <div className={cn("relative", className)}>
      {/* Hidden input the form reads via FormData. Marked required when the
          parent declares it; HTML5 validation surfaces the standard
          "please fill in this field" tooltip if the user submits empty. */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
        // The hidden input itself is never focused; aria-hidden keeps it
        // out of the AT tree.
        aria-hidden
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            data-test={dataTest}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            <span className="truncate">{selectedLabel || placeholder}</span>
            <div className="ml-2 flex shrink-0 items-center gap-1">
              {selectedLabel && !disabled && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Clear selection"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commit("");
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => commit(opt.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value === opt.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
