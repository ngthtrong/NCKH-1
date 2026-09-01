# Biên bản kỹ thuật APP-02 — invitation và tenant membership

**Ngày:** 2026-09-01 (UTC)  
**Phạm vi:** control-plane invitation, tenant membership/ownership, OpenAPI/web và Compose local  
**Kết luận:** APP-02 hoàn tất trong phạm vi local đã khóa; email delivery thật tiếp tục để sau.

## Luồng đã đóng

- Owner/Admin tạo invitation theo tenant/email/role. Token 256-bit chỉ trả về một lần và chỉ SHA-256
  được lưu; invitation có TTL bảy ngày và trạng thái `PENDING/ACCEPTED/REJECTED/REVOKED/EXPIRED`.
- Người giữ link xem preview, nhưng accept/reject bắt buộc global account có đúng email nhận lời mời.
  Cả accept và reject idempotent; accept tạo hoặc kích hoạt lại membership.
- Admin/Owner xem và thu hồi lời mời pending trên Members UI. SMTP/provider ngoài local không nằm trong
  APP-02; người mời sao chép link local để kiểm tra luồng.
- Role/revoke tiếp tục tăng `security_version`. Chuyển ownership chỉ cho Owner, khóa các active
  membership của tenant, đổi Owner cũ thành Admin và active member đích thành Owner trong một transaction.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend clean regression | 20 suite, 78/78 test pass; 0 failure, 0 error, 0 skip |
| Baseline backend | Giữ đủ 68 test sau APP-01; thêm 10 test invitation/ownership |
| Flyway control | V1–V5 áp dụng thành công trên PostgreSQL 18.6 Testcontainers |
| OpenAPI/generated TypeScript | `api:check` pass; không drift |
| Frontend unit | 6 file, 8/8 test pass; giữ đủ 7 test sau APP-01 và thêm 1 invitation test |
| Frontend lint/build | `lint` và production build pass |
| Compose local | `scripts/dev-up.sh` build/restart exit 0; API/Web healthy |
| Playwright baseline | Đúng 2 case Pool/Silo hiện hữu pass bằng Chromium, 2/2 |
| APP-02 smoke | Invite/preview/accept lặp lại/membership/ownership transfer pass; token Owner cũ bị `403` |

## Ranh giới kết luận

- Smoke dùng tài khoản/tenant có tiền tố `verify-invite-*` trong database local. Đây là fixture kỹ thuật,
  không phải người tham gia, dữ liệu khảo sát, dữ liệu định lượng hay artifact nghiên cứu.
- Chưa gửi email thật; link chỉ được hiển thị một lần trên UI local. SMTP production và template/delivery
  provider tiếp tục chờ credential/hạ tầng thật.
- Không chạy P2 measurement, không thay đổi kết quả/score/ADR, và không suy luận Cổng B/E từ test này.
