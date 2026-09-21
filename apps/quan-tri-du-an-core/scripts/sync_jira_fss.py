import sys, os, json, urllib.request, urllib.parse, base64, ssl, datetime

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

username = "bachnt.sbsi"
password = "bB;hz,u979Xj#7"
auth_b64 = base64.b64encode(f"{username}:{password}".encode('utf-8')).decode('utf-8')

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
    'thaonp1.sbsi': 'ThaoNP',
    'tuanna.sbsi': 'TuanNA',
    'huongptt.sbsi': 'HuongPTT',
    'tractt.sbsi': 'TraCTT',
    'hungbq.sbsi': 'HungBQ',
    'huonglt1.sbsi': 'HuongLT',
    'trinhnt.sbsi': 'TrinhNT',
    'anntt.sbsi': 'AnNTT',
    'hadt.sbsi': 'HaDT',
    'suonght.sbsi': 'SuongHT',
    'mai.cao': 'Mai.Cao',
    'hien.dinh': 'Hien.Dinh',
    'phuong.nguyenngoc': 'PhuongNN'
}

def sync_jira():
    jql = 'project in (SBSIUAT, SBSIEXT) ORDER BY created DESC'
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/json',
        'User-Agent': 'SBSI-Portal-Sync/2.0'
    }

    print("Đang kết nối Jira FSS (https://projects.fss.com.vn) - Đồng bộ TOÀN BỘ issue SBSI...")
    
    issues = []
    start_at = 0
    max_results = 100

    while True:
        url = f"https://projects.fss.com.vn/rest/api/2/search?jql={urllib.parse.quote(jql)}&startAt={start_at}&maxResults={max_results}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            batch = data.get("issues", [])
            total_jira = data.get("total", 0)
            issues.extend(batch)
            print(f"  Đã tải {len(issues)}/{total_jira} issue...")
            if len(issues) >= total_jira or len(batch) == 0:
                break
            start_at += len(batch)

    print(f"✅ Tải thành công toàn bộ {len(issues)} issue từ Jira FSS!")

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
        elif any(k in summary_lower for k in ["mobile", "app", "bottom sheet", "smart-otp", "smart otp"]):
            platform = "mobile"
        elif any(k in summary_lower for k in ["web", "online", "đặt lệnh", "bảng giá", "lệnh khớp", "tổng hợp lệnh", "sổ lệnh", "báo cáo", "webtrading", "chuyển chứng khoán"]):
            platform = "web"
        elif any(k in summary_lower for k in ["margin", "vmr", "032007", "0320", "ký quỹ", "lntype"]):
            platform = "margin"
        elif any(k in summary_lower for k in ["ci", "tiền", "danh mục tài sản", "tài sản", "quản lý tài sản", "asset", "chuyển tiền"]):
            platform = "ci"
        elif any(k in summary_lower for k in ["ekyc", "onboard", "onboarding"]):
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
        elif any(k in summary_lower for k in ["định dạng tên", "tên báo cáo", "tên file", "sao kê tiền", "sao kê chứng khoán"]):
            related_tc = "TC_WEB_UC62_270"
        elif any(k in summary_lower for k in ["đổi tên danh mục", "danh mục yêu thích trùng", "trùng với danh mục đã có", "sbsiext-215"]):
            related_tc = "TC_WEB_UC08_038"

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

    all_reporters = sorted(list(set(i["reporterUser"] for i in formatted if i["reporterUser"])))

    root_dir = r"c:\Users\AD\Desktop\HDSD\HDSD"
    payload = {
        "syncedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(formatted),
        "allowedUsers": all_reporters,
        "issues": formatted
    }

    folders = [
        root_dir,
        os.path.join(root_dir, "11_Deploy_Web", "CLOUDFLARE_PAGES_DEPLOY"),
        os.path.join(root_dir, "07_Maris_Product", "miso"),
        os.path.join(root_dir, "08_SBSI_Project_Mgmt", "quan-tri-du-an-core"),
        os.path.join(root_dir, "08_SBSI_Project_Mgmt", "sbsi-management-project-main", "sbsi-management-project-main", "apps", "quan-tri-du-an-core", "public"),
        os.path.join(root_dir, "08_SBSI_Project_Mgmt", "sbsi-management-project-main", "sbsi-management-project-main", "apps", "quan-tri-du-an-core", "src", "data")
    ]

    js_content = 'window.__SBSI_JIRA_DATA__ = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n'

    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "jira_sbsiuat_issues.json"), "w", encoding="utf-8") as out_f:
            json.dump(payload, out_f, ensure_ascii=False, indent=2)
        with open(os.path.join(folder, "jira_sbsiuat_issues.js"), "w", encoding="utf-8") as out_js:
            out_js.write(js_content)
        print(f"Đã lưu json & js ({len(formatted)} issues) vào: {folder}")

    # Đẩy lên Public Cloudflare Worker API (KV Cache sbsi_jira_issues)
    try:
        cf_url = "https://sbsi-uat-api.tungbachntb.workers.dev/api/state?key=sbsi_jira_issues"
        cf_payload = {
            "platform": "custom",
            "key": "sbsi_jira_issues",
            "tester": "Jira FSS Full Auto Sync",
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
        with urllib.request.urlopen(cf_req, timeout=15) as cf_resp:
            print(f"✅ Đã đồng bộ thành công {len(formatted)} issue lên Public Cloudflare API ({cf_resp.status})!")
    except Exception as e:
        print(f"⚠️ Không thể cập nhật Public Cloudflare API: {e}")

    # Copy script to root sync_jira_fss.py for permanent persistence
    try:
        with open(__file__, 'r', encoding='utf-8') as sf:
            content = sf.read()
        with open(os.path.join(root_dir, "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        with open(os.path.join(root_dir, "11_Deploy_Web", "CLOUDFLARE_PAGES_DEPLOY", "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        with open(os.path.join(root_dir, "07_Maris_Product", "miso", "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        with open(os.path.join(root_dir, "08_SBSI_Project_Mgmt", "quan-tri-du-an-core", "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        with open(os.path.join(root_dir, "08_SBSI_Project_Mgmt", "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        with open(os.path.join(root_dir, "08_SBSI_Project_Mgmt", "sbsi-management-project-main", "sbsi-management-project-main", "apps", "quan-tri-du-an-core", "scripts", "sync_jira_fss.py"), 'w', encoding='utf-8') as df:
            df.write(content)
        print("Đã cập nhật file script sync_jira_fss.py tại các thư mục dự án.")
    except Exception as e:
        print("Copy script notice:", e)

    # Thống kê
    status_counts = {}
    type_counts = {}
    rep_counts = {}
    plat_counts = {}

    for i in formatted:
        status_counts[i['status']] = status_counts.get(i['status'], 0) + 1
        type_counts[i['type']] = type_counts.get(i['type'], 0) + 1
        rep_counts[i['reporterNick']] = rep_counts.get(i['reporterNick'], 0) + 1
        plat_counts[i['platform']] = plat_counts.get(i['platform'], 0) + 1

    print("\n=======================================================")
    print(f"📊 BÁO CÁO ĐỒNG BỘ JIRA FSS (THỜI ĐIỂM: {payload['syncedAt']})")
    print(f"Tổng số Issue đã đồng bộ: {len(formatted)}")
    print("-------------------------------------------------------")
    print("📌 Theo Phân hệ:")
    for p, c in sorted(plat_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {p.upper()}: {c} issue")
    print("-------------------------------------------------------")
    print("📌 Theo Trạng thái:")
    for s, c in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {s}: {c} issue")
    print("-------------------------------------------------------")
    print("📌 Theo Loại Issue:")
    for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {t}: {c} issue")
    print("-------------------------------------------------------")
    print("📌 Top Người Log:")
    for r, c in sorted(rep_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"   • {r}: {c} issue")
    print("=======================================================")

    return formatted

if __name__ == "__main__":
    sync_jira()
