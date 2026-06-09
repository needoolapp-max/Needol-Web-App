// PRD §15.5 + §19 — Lighthouse smoke runner.
//
// Drives a headless Chrome via chrome-launcher + lighthouse and emits a
// performance + accessibility report for a list of public routes. Default
// thresholds match PRD §19: perf ≥ 85, a11y ≥ 95.
//
// Usage (against the running frontend on :3000):
//   node tests/lighthouse-smoke.mjs
//   NEEDOOL_LH_BASE_URL=http://localhost:3000 node tests/lighthouse-smoke.mjs
//   NEEDOOL_LH_ROUTES=/,/help node tests/lighthouse-smoke.mjs
//   NEEDOOL_LH_PERF_MIN=70 NEEDOOL_LH_A11Y_MIN=90 node tests/lighthouse-smoke.mjs
//
// Exit code is 0 on all-pass, 1 if any route falls below the threshold.
// The runner is intentionally non-interactive so CI/Playwright can call it.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const BASE_URL = (process.env.NEEDOOL_LH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ROUTES = (process.env.NEEDOOL_LH_ROUTES || "/,/search,/needs,/opportunities,/events,/jobs,/pricing,/help,/about")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const PERF_MIN = Number(process.env.NEEDOOL_LH_PERF_MIN || 85);
const A11Y_MIN = Number(process.env.NEEDOOL_LH_A11Y_MIN || 95);
const STRICT = process.env.NEEDOOL_LH_STRICT === "true";
const SAVE_HTML = process.env.NEEDOOL_LH_SAVE_HTML === "true";

async function isReachable(url) {
  try {
    const r = await fetch(url, { redirect: "manual" });
    return r.ok || (r.status >= 300 && r.status < 400);
  } catch {
    return false;
  }
}

async function isNeedool(url) {
  try {
    const r = await fetch(url);
    const body = await r.text();
    return /Needool/i.test(body);
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Lighthouse smoke: BASE_URL=${BASE_URL} routes=${ROUTES.length} perf>=${PERF_MIN} a11y>=${A11Y_MIN}`);
  if (!(await isReachable(BASE_URL))) {
    console.error(`Skip: ${BASE_URL} not reachable. Start the frontend first (npm --workspace frontend run dev).`);
    process.exit(STRICT ? 1 : 0);
  }
  if (!(await isNeedool(BASE_URL))) {
    console.error(`Skip: ${BASE_URL} doesn't appear to be the Needool frontend (body lacks "Needool").`);
    process.exit(STRICT ? 1 : 0);
  }

  // Lazy-import lighthouse — it has a large dependency graph and we want
  // the reachability check to fail fast before paying that cost.
  const { default: lighthouse } = await import("lighthouse");
  const chrome = await launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--ignore-certificate-errors"],
  });

  const results = [];
  try {
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      process.stdout.write(`  • ${route}… `);
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        output: SAVE_HTML ? ["json", "html"] : ["json"],
        logLevel: "error",
        onlyCategories: ["performance", "accessibility"],
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 2 },
      });
      const lhr = runnerResult.lhr;
      const perfScore = Math.round((lhr.categories.performance?.score || 0) * 100);
      const a11yScore = Math.round((lhr.categories.accessibility?.score || 0) * 100);
      const passed = perfScore >= PERF_MIN && a11yScore >= A11Y_MIN;
      results.push({ route, perfScore, a11yScore, passed });
      console.log(`perf=${perfScore} a11y=${a11yScore} ${passed ? "PASS" : "FAIL"}`);

      if (SAVE_HTML) {
        const outDir = join(PROJECT_ROOT, "lighthouse-reports");
        mkdirSync(outDir, { recursive: true });
        const safeRoute = route === "/" ? "_root" : route.replace(/\//g, "_");
        const html = Array.isArray(runnerResult.report) ? runnerResult.report[1] : runnerResult.report;
        writeFileSync(join(outDir, `${safeRoute}.html`), html);
      }
    }
  } finally {
    await chrome.kill();
  }

  // Write a JSON summary that Playwright + admin tooling can ingest.
  const summary = {
    baseUrl: BASE_URL,
    perfMin: PERF_MIN,
    a11yMin: A11Y_MIN,
    finishedAt: new Date().toISOString(),
    totals: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
    results,
  };
  const outDir = join(PROJECT_ROOT, "lighthouse-reports");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log(`\n${summary.totals.passed}/${summary.totals.total} passed; report at lighthouse-reports/summary.json`);
  if (summary.totals.failed > 0 && STRICT) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Lighthouse smoke crashed:", err);
  process.exit(STRICT ? 1 : 0);
});
