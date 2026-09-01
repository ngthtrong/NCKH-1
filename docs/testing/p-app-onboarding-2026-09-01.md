# Biên bản kỹ thuật APP-01 — đăng ký và onboarding local

**Ngày:** 2026-09-01 (UTC)  
**Phạm vi:** `apps/api`, OpenAPI/generated TypeScript, `apps/web` và stack Compose local  
**Kết luận:** APP-01 hoàn tất trong phạm vi local/fake đã khóa.

## Luồng đã đóng

- User đăng ký trên host trung tâm; email được chuẩn hóa, password dùng BCrypt và global access token
  chỉ được giữ trong memory của tab.
- User tạo tenant `PENDING_PAYMENT` với tier và placement đã chọn, đồng thời trở thành Owner.
- Owner tạo payment session idempotent rồi xác nhận thành công bằng adapter `fake`. Server tự tạo
  callback có chữ ký và đưa callback qua cùng đường verify/idempotency như webhook; amount/currency
  phải khớp transaction trước khi enqueue provisioning.
- UI đọc và polling trạng thái payment/provisioning, hiển thị lỗi có hướng retry. Khi worker đưa tenant
  tới `ACTIVE`, UI dùng transfer code hiện hữu để chuyển sang subdomain và exchange tenant session.
- Onboarding status chỉ cho Owner/Admin của đúng tenant; tenant khác nhận `404`, Member nhận `403`.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend clean regression | 19 suite, 68/68 test pass; 0 failure, 0 error, 0 skip |
| Baseline backend | Giữ đủ 58 test trước APP-01; thêm 10 test cho registration/onboarding/payment fake |
| OpenAPI/generated TypeScript | `api:generate`, `api:check` pass; không drift |
| Frontend unit | 5 file, 7/7 test pass; giữ đủ 5 test baseline và thêm 2 test |
| Frontend lint/build | `lint` và production build pass |
| Compose local | `scripts/dev-up.sh` build/restart exit 0; API/Web healthy |
| Playwright baseline | Đúng 2 case Pool/Silo hiện hữu pass bằng Chromium, 2/2 |
| Onboarding smoke | `register → tenant → fake payment → provisioning ACTIVE → tenant exchange` pass trên Pool |

Lệnh backend dùng cache Maven tạm vì home của môi trường kiểm tra read-only:

```bash
cd apps/api
MAVEN_USER_HOME=/tmp/nckh-maven-home ./mvnw -q \
  -Dmaven.repo.local=/tmp/nckh-m2 clean test
```

Lệnh frontend và E2E:

```bash
cd apps/web
npm run api:check
npm run lint
npm test
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/nckh-playwright-browsers \
  E2E_ENV_FILE=../../infra/.env npm run test:e2e
```

## Ranh giới kết luận

- Đây là kiểm tra kỹ thuật bằng fixture disposable trên stack local, không phải số liệu nghiên cứu,
  P2 measurement, pilot, nghiệm thu diện rộng hay thực nghiệm người dùng.
- Mức tiền trong UI là giá trị mô phỏng để chạy fake adapter, không phải dữ liệu thị trường, kết quả
  định giá hay bằng chứng thương mại.
- Chưa tích hợp provider thanh toán thật, VPS, DNS/TLS production hoặc credential ngoài local.
- Kết quả này không thay đổi trạng thái `Proposed` của ADR và không làm Cổng B/E đạt.
