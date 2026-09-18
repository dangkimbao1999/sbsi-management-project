---
name: new-app
description: Scaffold and initialize a new Next.js App Router project in this monorepo following SBSI standard stack and conventions. Use when the user asks to create, scaffold, or initialize a new app (e.g., /new-app <name>).
---

# New App Scaffolding Procedure

Create a new Next.js application within the `apps/` directory following the monorepo's standard stack.

## Arguments & Discovery

If the app name was not provided, ask the user:
- Tên app (kebab-case, ví dụ `quan-tri-kenh-so`, `bao-cao-tai-chinh`).
- Mục đích chính của app (1-2 câu).
- App có cần Cloudflare KV để lưu trữ dữ liệu không?

## 1. Khởi tạo cấu trúc file

Tạo thư mục `apps/<tên-app>/` với các file chuẩn sau:

### `apps/<tên-app>/package.json`
```json
{
  "name": "<tên-app>",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}
```
*(Nếu app cần dùng Cloudflare KV, thêm `"@sbsi/cloudflare-kv": "workspace:*"` vào `dependencies`)*.

### `apps/<tên-app>/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `apps/<tên-app>/next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

### `apps/<tên-app>/src/app/layout.tsx`
```tsx
export const metadata = {
  title: "<tên-app> — SBSI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

### `apps/<tên-app>/src/app/page.tsx`
```tsx
export default function Page() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>{"<tên-app>"} — SBSI</h1>
      <p>Ứng dụng đang trong quá trình phát triển.</p>
    </main>
  );
}
```

*(Nếu app cần Cloudflare KV, tạo thêm `apps/<tên-app>/.env.example` với các biến `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_KV_NAMESPACE_ID`, `CLOUDFLARE_API_TOKEN`)*.

> [!IMPORTANT]
> **Không** copy `src/legacy/`, `LegacyPage.tsx`, hoặc `scripts/extract-legacy.mjs` từ `quan-tri-du-an-core` — đó là cơ chế chuyển đổi đặc thù cho trang HTML cũ, không phải mẫu cho app mới tinh.

## 2. Cài đặt dependency & Build kiểm tra

```bash
pnpm install
pnpm --filter <tên-app> build
```
Sửa toàn bộ lỗi phát sinh nếu build thất bại trước khi báo hoàn thành.

## 3. Viết tài liệu `apps/<tên-app>/AGENTS.md`

Dùng mẫu `docs/templates/subproject-CLAUDE-template.md` làm khung, điền đầy đủ thông tin:
- Dòng đầu trỏ về root `[AGENTS.md](../../AGENTS.md)`.
- Mô tả app, stack, các lệnh chạy (`pnpm --filter <tên-app> dev|build`).
- Biến môi trường cần thiết (nếu có).

## 4. Cập nhật bảng Danh sách App ở root `AGENTS.md`

Thêm 1 dòng vào bảng "Danh sách app hiện có" trong root `AGENTS.md` và `CLAUDE.md`.

## 5. Báo cáo kết quả cho người dùng

Thông báo:
- Đường dẫn app đã tạo.
- Hướng dẫn chạy thử: `pnpm --filter <tên-app> dev`.
- Biến môi trường cần điền (nếu có).
- Nhắc người dùng xác nhận trước khi commit.
