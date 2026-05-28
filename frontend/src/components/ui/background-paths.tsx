import { motion, useReducedMotion, useInView, MotionConfig } from "framer-motion";
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { SearchBar } from "@/components/search/SearchBar";
import { Globe2, ShieldCheck, Zap, ArrowRight } from "lucide-react";

function FloatingPaths({ position, animate }: { position: number; animate: boolean }) {
  // 18 paths per layer (down from 28) — still visually dense, ~36% fewer SVG nodes.
  const paths = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.4 + i * 0.03,
    opacity: 0.06 + i * 0.018,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="url(#needool-grad)"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={
              animate
                ? {
                    pathLength: 1,
                    opacity: [0.2, path.opacity, 0.2],
                    pathOffset: [0, 1, 0],
                  }
                : { pathLength: 1, opacity: path.opacity * 0.6 }
            }
            transition={
              animate
                ? {
                    duration: 18 + (path.id % 7) * 3,
                    repeat: Infinity,
                    ease: "linear",
                  }
                : { duration: 0 }
            }
          />
        ))}
        <defs>
          <linearGradient id="needool-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0277b4" />
            <stop offset="50%" stopColor="#00a2c5" />
            <stop offset="100%" stopColor="#02e3ea" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const headline = ["Find", "Skilled", "Providers"];
const trustChips = [
  { icon: Globe2, label: "Worldwide reach" },
  { icon: ShieldCheck, label: "Active-first ranking" },
  { icon: Zap, label: "Free to browse" },
];

export function NeedoolHero() {
  // Respect the user's reduced-motion setting AND pause the looping background
  // when the hero is offscreen, so we're not burning rAF on a hidden section.
  // `MotionConfig reducedMotion="user"` lets framer-motion auto-skip the
  // one-shot entrance animations for reduced-motion users.
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const inView = useInView(heroRef, { amount: 0.1 });
  const animatePaths = !reduce && inView;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-border bg-sidebar/90 min-h-[580px] flex items-center"
      >
        {/* Animated background paths */}
        <FloatingPaths position={1} animate={animatePaths} />
        <FloatingPaths position={-1} animate={animatePaths} />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 sm:py-20 text-center">
          {/* Animated headline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-6">
              Nigeria soft launch · Global provider directory
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.04] mb-0">
              {headline.map((word, wi) => (
                <span key={wi} className="inline-block mr-[0.22em] last:mr-0">
                  {word.split("").map((letter, li) => (
                    <motion.span
                      key={`${wi}-${li}`}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: wi * 0.12 + li * 0.035,
                        type: "spring",
                        stiffness: 140,
                        damping: 22,
                      }}
                      className={`inline-block ${
                        wi === headline.length - 1
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent"
                          : "text-foreground"
                      }`}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
              <br />
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-success text-5xl sm:text-6xl md:text-7xl"
              >
                You Can Trust.
              </motion.span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.55 }}
            className="mx-auto mb-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
          >
            Needool connects you with active professionals, businesses, and opportunities — from
            Lagos to anywhere in the world.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            className="mx-auto mb-6 max-w-2xl"
          >
            <SearchBar variant="hero" />
          </motion.div>

          {/* Trust chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
          >
            {trustChips.map(({ icon: Icon, label }) => (
              <span key={label} className="trust-chip">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.45 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              to="/signup"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
            >
              Join Needool Free
            </Link>
            <Link
              to="/search"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-card"
            >
              Browse providers <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
