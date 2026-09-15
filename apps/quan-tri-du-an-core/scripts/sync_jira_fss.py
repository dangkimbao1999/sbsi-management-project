import sys, os, json, urllib.request, urllib.parse, base64, ssl, datetime
sys.stdout.reconfigure(encoding='utf-8')


def load_dotenv(path):
    """Minimal .env loader (no external dependency) — only fills in vars
    that aren't already set in the real environment, standard dotenv
    precedence. Lets you double-click SYNC_JIRA_NOW.bat each morning
    without having to `set` env vars by hand first."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Security fix vs. the original script: credentials used to be hardcoded
# with a fallback default. They now come from scripts/.env (gitignored,
# never committed) or real env vars — same account, same behavior, no
# secret in source.
username = os.environ.get("JIRA_USER")
password = os.environ.get("JIRA_PASS")
if not username or not password:
    print("ERROR: Set JIRA_USER and JIRA_PASS in scripts/.env (copy scripts/.env.example) or as environment variables before running this script.")
    sys.exit(1)

auth_b64 = base64.b64encode(f"{username}:{password}".encode('utf-8')).decode('utf-8')

ALLOWED_USERS = [
    'cuongnt.sbsi',
    'anhll.sbsi',
    'bachnt.sbsi',
    'baodk.sbsi',
    'huypn.sbsi',
    'longnh.sbsi',
    'ngamtq.sbsi',
    'quocpb.sbsi',
    'vinhtq.sbsi'
]

USER_DISPLAY_MAP = {
    'cuongnt.sbsi': 'CuongNT',
    'anhll.sbsi': 'AnhLL',
    'bachnt.sbsi': 'BachNT',
    'baodk.sbsi': 'BaoDK',
    'huypn.sbsi': 'HuyPN',
    'longnh.sbsi': 'LongNH',
    'ngamtq.sbsi': 'NgaMTQ',
    'quocpb.sbsi': 'QuocPB',
    'vinhtq.sbsi': 'VinhTQ',
    'mai.cao': 'Mai.Cao'
}

def sync_jira():
    user_list = ", ".join(f'"{r}"' for r in ALLOWED_USERS)
    # LỌC CHÍNH XÁC THEO 9 CHUYÊN VIÊN SBSI
    jql = f'project = SBSIUAT AND (reporter in ({user_list}) OR assignee in ({user_list})) ORDER BY created DESC'
    url = f"https://projects.fss.com.vn/rest/api/2/search?jql={urllib.parse.quote(jql)}&maxResults=100"

    print("Đang kết nối Jira FSS (https://projects.fss.com.vn) - Lọc 9 chuyên viên SBSI...")
    req = urllib.request.Request(url, headers={
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/json',
        'User-Agent': 'SBSI-Portal-Sync/2.0'
    })

    with urllib.request.urlopen(req, context=ctx, timeout=25) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        issues = data.get("issues", [])
        print(f"Thành công! Tìm thấy {len(issues)} issue thuộc 9 chuyên viên SBSI:")

        formatted = []
        for iss in issues:
            f = iss.get("fields", {}) or {}
            rep = f.get("reporter") or {}
            ass = f.get("assignee") or {}
            rep_user = (rep.get("name", "") or "").lower()
            rep_display = rep.get("displayName", rep_user)
            ass_user = (ass.get("name", "") or "").lower()
            ass_display = ass.get("displayName", "Chưa gán")
            ba_field = f.get("customfield_12401") or {}
            ba_display = ba_field.get("displayName", "") if isinstance(ba_field, dict) else ""

            summary = f.get("summary", "")
            summary_lower = summary.lower()
            platform = "general"
            if any(k in summary_lower for k in ["ui/ux", "uiux"]):
                platform = "uiux"
            elif any(k in summary_lower for k in ["mobile", "app", "bottom sheet"]):
                platform = "mobile"
            elif any(k in summary_lower for k in ["web", "online", "đặt lệnh", "bảng giá", "lệnh khớp", "tổng hợp lệnh", "sổ lệnh", "báo cáo", "webtrading"]):
                platform = "web"
            elif any(k in summary_lower for k in ["margin", "vmr", "032007", "0320", "ký quỹ", "lntype"]):
                platform = "margin"
            elif any(k in summary_lower for k in ["ci", "tiền", "danh mục tài sản", "tài sản", "quản lý tài sản", "asset"]):
                platform = "ci"
            elif any(k in summary_lower for k in ["ekyc", "onboard"]):
                platform = "ekyc"
            elif any(k in summary_lower for k in ["tprl", "bond", "tenora", "5866"]):
                platform = "tenora"
            elif any(k in summary_lower for k in ["flex", "core", "02001", "3390", "procedure"]):
                platform = "flex"

            related_tc = ""
            if any(k in summary_lower for k in ["bộ lọc sàn", "tổng hợp lệnh khớp"]):
                related_tc = "TC_WEB_REP_001"
            elif any(k in summary_lower for k in ["thông tin mã", "thể hiện thông tin mã"]):
                related_tc = "TC_WEB_UC65_272"
            elif any(k in summary_lower for k in ["điều hướng", "danh mục tài sản"]):
                related_tc = "TC_WEB_AST_001"
            elif any(k in summary_lower for k in ["vỡ layout responsive", "laptop", "1536px"]):
                related_tc = "TC_WEB_PRC_001"

            priority = "Medium"
            pri_name = (f.get("priority") or {}).get("name", "Medium")
            if pri_name in ["Blocker", "Critical"]: priority = "Critical"
            elif pri_name in ["High", "Major"]: priority = "High"
            elif pri_name in ["Low", "Minor", "Trivial"]: priority = "Low"

            fmt_created = f.get("created", "")[:16].replace("T", " ")
            fmt_updated = f.get("updated", "")[:16].replace("T", " ")

            item = {
                "id": iss.get("key"),
                "platform": platform,
                "title": summary,
                "type": (f.get("issuetype") or {}).get("name", "Bug"),
                "priority": priority,
                "status": (f.get("status") or {}).get("name", "Open"),
                "assignee": ass_display,
                "assigneeUser": ass_user,
                "reporter": rep_display,
                "reporterUser": rep_user,
                "reporterNick": USER_DISPLAY_MAP.get(rep_user, rep_display),
                "ba": ba_display,
                "desc": f.get("description", "") or "",
                "relatedTc": related_tc,
                "jiraUrl": f"https://projects.fss.com.vn/browse/{iss.get('key')}",
                "createdAt": fmt_created,
                "updatedAt": fmt_updated,
                "source": "JIRA_FSS"
            }
            formatted.append(item)
            print(f" - [{item['id']}] {item['title']} | Rep: {item['reporterNick']} | Ass: {item['assignee']}")

        payload = {
            "syncedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total": len(formatted),
            "allowedUsers": ALLOWED_USERS,
            "issues": formatted
        }

        # Write json & js straight into this app's public/ folder (single
        # source of truth now — the original script mirrored these into
        # several hardcoded local folders on one specific machine, which
        # doesn't apply in the monorepo).
        script_dir = os.path.dirname(os.path.abspath(__file__))
        public_dir = os.path.join(script_dir, "..", "public")

        js_content = 'window.__SBSI_JIRA_DATA__ = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n'

        with open(os.path.join(public_dir, "jira_sbsiuat_issues.json"), "w", encoding="utf-8") as out_f:
            json.dump(payload, out_f, ensure_ascii=False, indent=2)
        with open(os.path.join(public_dir, "jira_sbsiuat_issues.js"), "w", encoding="utf-8") as out_js:
            out_js.write(js_content)
        print(f"Đã lưu json & js ({len(formatted)} issues) vào: {public_dir}")

        data_dir = os.path.join(script_dir, "..", "src", "data")
        os.makedirs(data_dir, exist_ok=True)
        with open(os.path.join(data_dir, "jira_sbsiuat_issues.json"), "w", encoding="utf-8") as out_df:
            json.dump(payload, out_df, ensure_ascii=False, indent=2)
        print(f"Đã lưu json ({len(formatted)} issues) vào: {data_dir}")

        # Tự động đẩy dữ liệu lên Public API Cloudflare Worker (KV Cache sbsi_jira_issues)
        try:
            cf_url = "https://sbsi-uat-api.tungbachntb.workers.dev/api/state?key=sbsi_jira_issues"
            cf_payload = {
                "platform": "custom",
                "key": "sbsi_jira_issues",
                "tester": "Jira FSS Auto Sync (9 Users)",
                "state": {
                    "count": len(formatted),
                    "total": len(formatted),
                    "syncedAt": payload["syncedAt"],
                    "issues": formatted
                }
            }
            cf_data = json.dumps(cf_payload).encode('utf-8')
            cf_req = urllib.request.Request(cf_url, data=cf_data, headers={
                'Content-Type': 'application/json',
                'User-Agent': 'SBSI-Jira-Sync/2.0'
            }, method='POST')
            with urllib.request.urlopen(cf_req, timeout=10) as cf_resp:
                print(f"✅ Đã đồng bộ thành công {len(formatted)} issue (9 user) lên Public Cloudflare API ({cf_resp.status})!")
        except Exception as e:
            print(f"⚠️ Không thể cập nhật Public Cloudflare API: {e}")

        return formatted

if __name__ == "__main__":
    sync_jira()
