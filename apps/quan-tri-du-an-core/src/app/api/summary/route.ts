// Ported from the original Cloudflare Pages Function: functions/api/summary.js
// Generates live aggregated UAT summary across all platforms

import { kvGet } from "@sbsi/cloudflare-kv";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlatformState = Record<string, unknown>;
type CentralState = Record<string, PlatformState>;

const TOTAL_DATASET: Record<string, number> = {
  mobile: 382,
  web: 271,
  core: 2033,
  tprl: 545,
  ekyc: 582
};

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  let centralState: CentralState = {
    mobile: {},
    web: {},
    core: {},
    tprl: {},
    ekyc: {}
  };

  try {
    const fetched = await kvGet<CentralState>("sbsi_central_state");
    if (fetched) centralState = fetched;
  } catch {
    // Cloudflare KV is optional / unconfigured; gracefully proceed with initial platforms
  }

  let grandTotal = 0;
  let grandPass = 0;
  let grandFail = 0;
  let grandPending = 0;
  const summary: Record<string, unknown> = {};

    for (const p in TOTAL_DATASET) {
      const total = TOTAL_DATASET[p];
      grandTotal += total;

      const pState = centralState[p] || {};
      let pass = 0,
        fail = 0,
        pending = 0;

      for (const id in pState) {
        const item = pState[id] as any;
        const st = ((typeof item === "object" ? item.status : item) || "").toLowerCase();
        if (st === "pass") pass++;
        else if (st === "fail") fail++;
        else if (st === "pending") pending++;
      }

      const tested = pass + fail + pending;
      const untested = total - tested;
      const pct = total > 0 ? Math.round((pass / total) * 100) : 0;

      summary[p] = { total, pass, fail, pending, untested, pct };

      grandPass += pass;
      grandFail += fail;
      grandPending += pending;
    }

    const grandTested = grandPass + grandFail + grandPending;
    const grandUntested = grandTotal - grandTested;
    const grandPct = grandTotal > 0 ? Math.round((grandPass / grandTotal) * 100) : 0;

    summary.overall = {
      total: grandTotal,
      pass: grandPass,
      fail: grandFail,
      pending: grandPending,
      untested: grandUntested,
      pct: grandPct
    };

    return corsJson({ success: true, summary, timestamp: Date.now() });
}
