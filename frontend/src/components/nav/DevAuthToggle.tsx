import { useAuth, type AuthState } from "@/context/AuthContext";
import { GripHorizontal } from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

const options: { value: AuthState; label: string }[] = [
  { value: "visitor", label: "Visitor" },
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
];

export function DevAuthToggle() {
  const { state, setState } = useAuth();
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const [ready, setReady] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("needool-dev-toggle-position");
    if (saved) {
      try {
        const next = JSON.parse(saved) as { x: number; y: number };
        if (Number.isFinite(next.x) && Number.isFinite(next.y)) {
          setPosition(next);
          setReady(true);
          return;
        }
      } catch {
        // Ignore malformed local state.
      }
    }
    setPosition({ x: 12, y: 12 });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("needool-dev-toggle-position", JSON.stringify(position));
  }, [position, ready]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    setPosition({
      x: Math.min(Math.max(event.clientX - dragRef.current.dx, 8), Math.max(window.innerWidth - 280, 8)),
      y: Math.min(Math.max(event.clientY - dragRef.current.dy, 8), window.innerHeight - 40),
    });
  }

  function endDrag() {
    dragRef.current = null;
  }

  return (
    <div
      className="fixed z-[100] flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg backdrop-blur"
      style={{ left: position.x, top: position.y, opacity: ready ? 1 : 0, maxWidth: "calc(100vw - 16px)" }}
    >
      <button
        type="button"
        aria-label="Move dev auth toggle"
        className="cursor-grab rounded-full px-2 py-1 text-muted-foreground active:cursor-grabbing hover:text-foreground"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <GripHorizontal className="h-3.5 w-3.5" />
      </button>
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:inline">Dev</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setState(o.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            state === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
