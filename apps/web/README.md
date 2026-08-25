# TenantFlow web

Frontend React/TypeScript cho ứng dụng nghiên cứu SaaS đa thuê bao. Access token chỉ tồn tại trong
bộ nhớ; refresh token do backend đặt bằng cookie `HttpOnly`, `Secure`, host-only. API nghiệp vụ suy
ra tenant từ host và token, vì vậy các DTO trong `src/api` không có trường `tenantId`.

## Chạy local

Yêu cầu Node.js 22.12 trở lên:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Vite phục vụ tại `http://localhost:5173` và chuyển tiếp `/api` đến
`VITE_API_PROXY_TARGET` (mặc định `http://localhost:8080`). Khi chạy Docker Compose, nginx phục vụ
SPA trên port 80 và chuyển `/api/` tới service `api:8080`.

## Kiểm tra

```bash
npm run lint
npm test
npm run build
```

Các route chính: `/login`, `/select-tenant`, `/auth/exchange`, `/dashboard`, `/kanban/:boardId`,
`/members`, `/resources`, `/notifications` và `/admin`.

## Hợp đồng bảo mật phía trình duyệt

- Mọi request gửi `credentials: include`; request thay đổi trạng thái chuyển cookie
  `XSRF-TOKEN` thành header `X-CSRF-TOKEN`.
- Tenant transfer dùng `tenantSlug` chỉ để xin mã chuyển một lần. API nghiệp vụ không nhận tenant
  từ form, query hoặc payload.
- Link thông báo chỉ được điều hướng nếu là đường dẫn nội bộ bắt đầu bằng `/`.
- URL tải tài nguyên do backend ký và giới hạn thời gian; frontend không tự dựng object key.
