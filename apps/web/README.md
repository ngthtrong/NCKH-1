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
npm run api:check
npm run lint
npm test
npm run build
```

### Playwright E2E trên stack local

Hai ca E2E đăng nhập và chọn riêng tenant Pool/Silo, sau đó cố ý gửi access token vừa phát sang
host tenant còn lại và yêu cầu backend trả `403`. Test chỉ đọc credential từ environment; không có
password seed trong mã kiểm thử hoặc file được commit.

```bash
npm run test:e2e:install
# Dùng trực tiếp credential seed local, không sao chép hoặc commit password.
E2E_ENV_FILE=../../infra/.env npm run test:e2e
```

Nếu cần chạy trên môi trường khác, sao chép `e2e/e2e.env.example` thành `e2e/.env.local`, điền
credential cục bộ và dùng `E2E_ENV_FILE=e2e/.env.local`. File local, trace, video, screenshot và HTML
report đều bị Git bỏ qua. Có thể đổi URL, hai tenant slug/URL trong file local; stack phải được seed
sẵn một tenant `POOL` và một tenant `SILO_DATABASE`, đều ở trạng thái `ACTIVE`. `E2E_GATEWAY_URL`
là địa chỉ loopback mà Node phân giải được; kiểm thử vẫn gửi đúng tenant hostname qua HTTP `Host`.

Các route chính: `/login`, `/select-tenant`, `/auth/exchange`, `/dashboard`, `/kanban/:boardId`,
`/members`, `/resources`, `/notifications` và `/admin`.

## Hợp đồng bảo mật phía trình duyệt

- Mọi request gửi `credentials: include`; request thay đổi trạng thái chuyển cookie
  `XSRF-TOKEN` thành header `X-CSRF-TOKEN`.
- Tenant transfer dùng `tenantSlug` chỉ để xin mã chuyển một lần. API nghiệp vụ không nhận tenant
  từ form, query hoặc payload.
- Link thông báo chỉ được điều hướng nếu là đường dẫn nội bộ bắt đầu bằng `/`.
- URL tải tài nguyên do backend ký và giới hạn thời gian; frontend không tự dựng object key.
