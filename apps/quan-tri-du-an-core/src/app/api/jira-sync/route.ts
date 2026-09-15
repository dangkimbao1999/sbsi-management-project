// Ported from the original Cloudflare Pages Function: functions/api/jira-sync.js
// Đồng bộ các Issue từ Jira FSS (Dự án SBSIUAT) liên quan đến 9 chuyên viên SBSI
//
// Security fix vs. the original: the Basic Auth credentials used to be
// hardcoded with a fallback default. They are now REQUIRED env vars
// (JIRA_USER / JIRA_PASS) with no fallback — same account, same behavior,
// just no plaintext secret committed to source.

import { corsJson, corsOptions } from "@/lib/cors";
import fallbackIssuesJson from "@/data/jira_sbsiuat_issues.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JIRA_BASE_URL = "https://projects.fss.com.vn";

// Danh sách 9 chuyên viên được chỉ định lọc issue log
const ALLOWED_USERS = [
  "cuongnt.sbsi",
  "anhll.sbsi",
  "bachnt.sbsi",
  "baodk.sbsi",
  "huypn.sbsi",
  "longnh.sbsi",
  "ngamtq.sbsi",
  "quocpb.sbsi",
  "vinhtq.sbsi"
];

// Map username sang tên hiển thị ngắn gọn & phân hệ
const USER_DISPLAY_MAP: Record<string, string> = {
  "cuongnt.sbsi": "CuongNT",
  "anhll.sbsi": "AnhLL",
  "bachnt.sbsi": "BachNT",
  "baodk.sbsi": "BaoDK",
  "huypn.sbsi": "HuyPN",
  "longnh.sbsi": "LongNH",
  "ngamtq.sbsi": "NgaMTQ",
  "quocpb.sbsi": "QuocPB",
  "vinhtq.sbsi": "VinhTQ",
  "mai.cao": "Mai.Cao"
};

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

function getFallbackSnapshot() {
  const data = fallbackIssuesJson as any;
  return {
    success: true,
    count: data.issues?.length || 0,
    totalJira: data.total || 0,
    allowedUsers: ALLOWED_USERS,
    issues: data.issues || [],
    syncedAt: data.syncedAt || new Date().toISOString(),
    source: "SNAPSHOT_FALLBACK"
  };
}

async function handleSync(request: Request) {
  const url = new URL(request.url);

  const username = process.env.JIRA_USER;
  const password = process.env.JIRA_PASS;

  if (!username || !password) {
    const fallback = await getFallbackSnapshot();
    if (fallback) return corsJson(fallback);
    return corsJson({
      success: false,
      error: "Jira sync is not configured: set JIRA_USER and JIRA_PASS (see .env.example)."
    });
  }

  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const includeAll = url.searchParams.get("includeAll") === "true";
  const maxResults = parseInt(url.searchParams.get("max") || "100", 10);

  // Xây dựng JQL: Lấy các issue được log (reporter) HOẶC được giao (assignee) bởi 9 chuyên viên SBSI
  let jql = "project = SBSIUAT AND resolution = Unresolved";
  if (!includeAll) {
    const userListStr = ALLOWED_USERS.map((r) => `"${r}"`).join(", ");
    jql += ` AND (reporter in (${userListStr}) OR assignee in (${userListStr}))`;
  }
  jql += " ORDER BY created DESC, assignee DESC, cf[12401] ASC, priority DESC, updated DESC";

  const jiraSearchUrl = `${JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(
    jql
  )}&maxResults=${maxResults}`;

  try {
    const jiraResp = await fetch(jiraSearchUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": "SBSI-UAT-Portal/1.0"
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!jiraResp.ok) {
      const fallback = await getFallbackSnapshot();
      if (fallback) return corsJson(fallback);
      const errText = await jiraResp.text();
      return corsJson({
        success: false,
        error: `Jira API Error ${jiraResp.status}: ${jiraResp.statusText}`,
        details: errText
      });
    }

    const jiraData = await jiraResp.json();
    const rawIssues = jiraData.issues || [];

    // Format issues sang chuẩn Portal
    const formattedIssues = rawIssues.map((iss: any) => {
      const f = iss.fields || {};
      const repUser = (f.reporter && f.reporter.name) || "";
      const repName = (f.reporter && (f.reporter.displayName || f.reporter.name)) || "Chưa rõ";
      const assUser = (f.assignee && f.assignee.name) || "";
      const assName = (f.assignee && (f.assignee.displayName || f.assignee.name)) || "Chưa gán";
      const baUser =
        (f.customfield_12401 && (f.customfield_12401.displayName || f.customfield_12401.name)) ||
        "";

      // Chuẩn hóa phân hệ (Platform)
      let platform = "general";
      const summaryLower = (f.summary || "").toLowerCase();
      if (
        summaryLower.includes("mobile") ||
        summaryLower.includes("app") ||
        summaryLower.includes("uiux")
      ) {
        platform = "mobile";
      } else if (
        summaryLower.includes("web") ||
        summaryLower.includes("online") ||
        summaryLower.includes("đặt lệnh") ||
        summaryLower.includes("bảng giá")
      ) {
        platform = "web";
      } else if (
        summaryLower.includes("margin") ||
        summaryLower.includes("vmr") ||
        summaryLower.includes("032007")
      ) {
        platform = "margin";
      } else if (summaryLower.includes("ci") || summaryLower.includes("tiền")) {
        platform = "ci";
      } else if (summaryLower.includes("ekyc") || summaryLower.includes("onboard")) {
        platform = "ekyc";
      } else if (
        summaryLower.includes("tprl") ||
        summaryLower.includes("bond") ||
        summaryLower.includes("tenora")
      ) {
        platform = "tenora";
      } else if (
        summaryLower.includes("flex") ||
        summaryLower.includes("core") ||
        summaryLower.includes("02001") ||
        summaryLower.includes("3390")
      ) {
        platform = "flex";
      }

      // Chuẩn hóa mức độ Priority
      let priority = "Medium";
      const priName = (f.priority && f.priority.name) || "Medium";
      if (priName === "Blocker" || priName === "Critical") priority = "Critical";
      else if (priName === "High" || priName === "Major") priority = "High";
      else if (priName === "Medium") priority = "Medium";
      else if (priName === "Low" || priName === "Minor" || priName === "Trivial") priority = "Low";

      // Chuẩn hóa ngày tháng
      const fmtDate = (isoStr: string) => {
        if (!isoStr) return "";
        try {
          const d = new Date(isoStr);
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`;
        } catch {
          return isoStr;
        }
      };

      return {
        id: iss.key,
        platform,
        title: f.summary || "(Không có tiêu đề)",
        type: (f.issuetype && f.issuetype.name) || "Bug",
        priority,
        status: (f.status && f.status.name) || "Open",
        assignee: assName,
        assigneeUser: assUser,
        reporter: repName,
        reporterUser: repUser,
        reporterNick: USER_DISPLAY_MAP[repUser] || repUser,
        ba: baUser,
        desc: f.description || "",
        relatedTc: "",
        jiraUrl: `${JIRA_BASE_URL}/browse/${iss.key}`,
        createdAt: fmtDate(f.created),
        updatedAt: fmtDate(f.updated),
        source: "JIRA_FSS"
      };
    });

    return corsJson({
      success: true,
      count: formattedIssues.length,
      totalJira: jiraData.total || 0,
      jql,
      allowedUsers: ALLOWED_USERS,
      issues: formattedIssues,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    const fallback = await getFallbackSnapshot();
    if (fallback) return corsJson(fallback);

    // Node's fetch wraps the real network error (DNS, TLS, connect-timeout —
    // e.g. Jira only being reachable from inside the corporate network) in
    // a generic "fetch failed" TypeError with the actual cause nested in
    // .cause. Surface it, since the original silently swallowed it too.
    const cause =
      error instanceof Error && "cause" in error && error.cause instanceof Error
        ? `: ${error.cause.message}`
        : "";
    return corsJson({
      success: false,
      error:
        (error instanceof Error ? error.message : "Unknown fetch error connecting to Jira FSS") +
        cause
    });
  }
}
