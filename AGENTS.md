# AGENTS.md

This file provides project-wide guidance to Google Antigravity (AGY) and AI coding assistants operating in this repository.

## Mục đích repo

Monorepo dùng chung cho các dự án nội bộ của team SBSI. Phần lớn thành viên không tự viết code — họ "vibecode": mô tả yêu cầu bằng lời cho AI assistant, assistant viết/chỉnh code thay họ. Vì vậy sự nhất quán về convention quan trọng hơn bình thường: mỗi app mới phải theo đúng stack/cấu trúc chuẩn dưới đây, để bất kỳ ai (kể cả không biết code) cũng có thể tiếp tục phát triển app đó mà không cần hiểu kiến trúc từ đầu.

## Commands (root)

```bash
pnpm install         # cài dependency cho toàn bộ workspace
pnpm dev             # turbo run dev — chạy dev server của mọi app
pnpm build           # turbo run build
pnpm lint            # turbo run lint
```

Chạy riêng 1 app: `pnpm --filter <tên-app> dev|build|start`.

## Stack chuẩn cho app mới

- **Next.js (App Router, TypeScript)** — mặc định cho mọi app mới, trừ khi có lý do rõ ràng để khác.
- **Turborepo + pnpm workspaces** (đã setup sẵn ở root, không cần đụng vào trừ khi thêm app/package mới).
- Deploy ngoài Cloudflare Pages (vd Vercel) — vì vậy nếu app cần lưu trữ dùng chung thì qua Cloudflare KV **bằng REST API** (package `packages/cloudflare-kv`), KHÔNG dùng KV binding trực tiếp (binding chỉ chạy được khi code chạy trên chính Cloudflare Workers runtime, không chạy được trên Vercel/Node bình thường).

## Tạo app mới

Sử dụng slash command `/new-app <tên-app>` hoặc kích hoạt skill `new-app`. Xem chi tiết quy trình tại `.agents/skills/new-app/SKILL.md`.

**Quan trọng:** Đừng lấy `apps/quan-tri-du-an-core` làm mẫu để copy — app đó có phần `src/legacy/` (chuyển đổi HTML tĩnh cũ sang Next.js) chỉ đặc thù cho việc fork app đó từ 1 site tĩnh có sẵn, KHÔNG phải pattern chuẩn cho app mới tinh. App mới luôn bắt đầu từ 1 Next.js app trơn theo `/new-app`.

## Cấu trúc thư mục

- `apps/<tên-app>/` — mỗi dự án là 1 app riêng biệt, có `AGENTS.md` (hoặc `CLAUDE.md`) riêng ghi context cụ thể của app đó (mô tả dự án, quyết định kiến trúc riêng, env var cần thiết, v.v.). Khi làm việc trong 1 app, luôn đọc `AGENTS.md` của app đó trước.
- `packages/<tên-package>/` — code dùng chung giữa nhiều app. Hiện có `@sbsi/cloudflare-kv` (client gọi Cloudflare KV qua REST API — `kvGet`/`kvPut`). Nếu 1 nhu cầu dùng chung xuất hiện ở ≥2 app, cân nhắc tách thành package mới ở đây thay vì copy code giữa các app.

## Danh sách app hiện có

| App | Mô tả ngắn | Chi tiết |
|---|---|---|
| `quan-tri-du-an-core` | Portal quản trị UAT cho dự án Core FSS (theo dõi test case, đồng bộ Jira) | `apps/quan-tri-du-an-core/AGENTS.md` |

(Cập nhật bảng này — hoặc để skill `/new-app` tự cập nhật — mỗi khi thêm app mới, để phần "Mục đích repo" ở trên luôn hữu ích cho việc điều hướng.)

## Hệ thống cấu hình Antigravity (`.agents/`)

- `.agents/rules/` — các quy tắc ngắn, luôn áp dụng:
  - `implementation-plan-required.md`: BẮT BUỘC lập `implementation_plan.md` và chờ phê duyệt trước khi build code.
  - `code-conventions.md`: Quy ước viết code tối giản, ưu tiên pattern sẵn có, verify thực tế.
  - `env-secrets.md`: Bảo mật bí mật, không commit file `.env`, không hardcode credential fallback.
  - `git-workflow.md`: Quy trình branch/worktree cô lập, cấm các lệnh phá hoại (`git reset --hard`, `git clean -fdx`).
  - `knowledge-base-maintenance.md`: Tự động cập nhật `apps/<app>/AGENTS.md` sau mỗi task có ý nghĩa.
- `.agents/skills/` — runbook và quy trình tác nghiệp theo yêu cầu:
  - `debugging`: Điều tra lỗi runtime, build fail, regression test.
  - `new-app`: Quy trình khởi tạo app Next.js mới trong monorepo (hỗ trợ slash command `/new-app`).
- `.agents/agents/` — định nghĩa vai trò subagent chuyên biệt:
  - `coder.md`: Subagent chuyên implement một task code cụ thể kèm verification.
  - `pr-reviewer.md`: Subagent review mã nguồn về tính đúng đắn, bảo mật và tuân thủ quy tắc.
- `.agents/hooks.json` — guardrails tự động qua Antigravity Lifecycle Hooks:
  - Chặn lệnh shell phá hoại (`git reset --hard`, `git clean -fdx`, `rm -rf /`, `terraform/pulumi destroy`, đọc `.env`).
  - Chặn sửa file trực tiếp trên `main`/`master` (trừ docs `AGENTS.md`, `CLAUDE.md`, `README.md`).
  - Chặn ghi credentials/private keys và chặn empty catch blocks / silent fallbacks.
  - Nhắc nhở cập nhật knowledge base khi kết thúc session có thay đổi trong `apps/`.

## Quy tắc Branch / Worktree

Mọi thay đổi code (không tính sửa `AGENTS.md`/`CLAUDE.md`/`README.md`) phải làm trong 1 branch hoặc worktree riêng biệt, không sửa trực tiếp trên `main`. Trước khi sửa code, tạo nhánh tính năng mới (ví dụ: `feat/...`, `fix/...`). Sau khi hoàn thành và kiểm thử, tạo commit, push và hỏi người dùng trước khi merge hoặc tạo PR.

## Quy tắc duy trì Knowledge Base

Sau mỗi task có ý nghĩa trên 1 app, agent tự động cập nhật `apps/<app>/AGENTS.md` — KHÔNG đợi người dùng yêu cầu. Mục đích: người dùng không phải giải thích lại bối cảnh từ đầu ở session sau, và assistant ở các phiên tiếp theo có thể tiếp tục đúng chỗ đang dang dở.
