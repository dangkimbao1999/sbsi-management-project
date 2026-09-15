// Ported from the original Cloudflare Pages Function: functions/api/state.js
// Supports multi-device, cross-browser synchronization for SBSI UAT Platform

import { kvGet, kvPut } from "@sbsi/cloudflare-kv";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlatformState = Record<string, unknown>;
type CentralState = Record<string, PlatformState>;

const INITIAL_PLATFORMS: CentralState = {
  mobile: {},
  web: {},
  core: {},
  tprl: {},
  ekyc: {}
};

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");
  const key = url.searchParams.get("key");

  // Support direct key retrieval (e.g. key=sbsi_jira_issues)
  if (key === "sbsi_jira_issues") {
    try {
      const kvData = await kvGet<any>("sbsi_jira_issues");
      if (kvData) {
        return corsJson({
          success: true,
          platform: "custom",
          key: "sbsi_jira_issues",
          state: kvData,
          timestamp: Date.now()
        });
      }
    } catch {}

    // Fallback to local snapshot file so call never fails
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "jira_sbsiuat_issues.json");
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return corsJson({
        success: true,
        platform: "custom",
        key: "sbsi_jira_issues",
        state: data,
        timestamp: Date.now()
      });
    } catch {}
  }

  try {
    const centralState =
      (await kvGet<CentralState>("sbsi_central_state")) ?? { ...INITIAL_PLATFORMS };

    if (platform) {
      const pState = centralState[platform] || {};
      return corsJson({
        success: true,
        platform,
        state: pState,
        timestamp: Date.now()
      });
    }

    return corsJson({
      success: true,
      state: centralState,
      timestamp: Date.now()
    });
  } catch (error) {
    return corsJson(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        state: INITIAL_PLATFORMS
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");

  try {
    const payload = (await request.json()) as PlatformState;
    const centralState =
      (await kvGet<CentralState>("sbsi_central_state")) ?? { ...INITIAL_PLATFORMS };

    if (platform && payload && typeof payload === "object") {
      if (!centralState[platform]) {
        centralState[platform] = {};
      }

      // Merge platform state
      centralState[platform] = {
        ...centralState[platform],
        ...payload
      };

      await kvPut("sbsi_central_state", centralState);

      // Auto append to audit log if single test case update detected
      const keys = Object.keys(payload);
      if (keys.length === 1) {
        const tcId = keys[0];
        const item = payload[tcId] as any;
        const status = typeof item === "object" ? item.status : item;
        const tester = typeof item === "object" ? item.tester : "Tester";
        const time =
          typeof item === "object" ? item.time : new Date().toLocaleTimeString("vi-VN");

        try {
          let logs = (await kvGet<any[]>("sbsi_audit_logs")) || [];
          logs.unshift({
            id: tcId,
            platform,
            status,
            tester,
            time,
            timestamp: Date.now()
          });
          if (logs.length > 50) logs = logs.slice(0, 50);
          await kvPut("sbsi_audit_logs", logs);
        } catch {
          // best-effort audit log, same as the original function
        }
      }

      return corsJson({
        success: true,
        message: "Platform state updated successfully",
        platform,
        updatedCount: Object.keys(payload).length,
        timestamp: Date.now()
      });
    }

    return corsJson(
      { success: false, error: "Invalid platform or payload" },
      { status: 400 }
    );
  } catch (error) {
    return corsJson(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
