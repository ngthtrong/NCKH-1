# ADR-0007: Phiên ràng buộc tenant bằng host, token, trạng thái và membership hiện tại

- **Trạng thái:** Accepted
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ2, RQ3; FR-01..06, SEC-01..09

## Bối cảnh

Một user có thể tham gia nhiều tenant. Chỉ dựa vào subdomain cho phép sửa Host; chỉ dựa JWT cho phép token tenant A dùng ở B; chỉ dựa claim role khiến revoke không có hiệu lực tới khi token hết hạn. Wildcard refresh cookie làm tăng blast radius giữa subdomain.

## Quyết định

- Login account tại host trung tâm; chọn tenant phát transfer code random, hash-at-rest, TTL ngắn, atomic single-use và gắn target host/user/tenant.
- Tenant host exchange code thành access JWT ngắn hạn và rotating opaque refresh token.
- Access token ở memory frontend; refresh cookie `HttpOnly`, `Secure`, host-only, `SameSite` phù hợp. Không wildcard domain cookie.
- Mỗi business request xác minh token cryptography/issuer/audience/expiry, route từ trusted Host, equality route tenant=`tid`, tenant Active và membership hiện tại/authz version.
- Refresh/logout dùng CSRF/Origin protection. Token family reuse làm revoke family.
- `tenant_id` từ payload/header không tham gia authorization. Mismatch fail trước datasource/business service.
- Project role kiểm từ application DB/policy; claim role chỉ là hint nếu có.

## Hệ quả

Mỗi request có control-plane lookup/cache invalidation burden. Đổi lại revoke/role change có hiệu lực nhanh và host boundary rõ. Cache membership/route nếu dùng phải key tenant+user, TTL ngắn và invalidation từ authz version; không thêm Redis v1.

## Xác minh

- Host/token cross-product, forged forwarding header, wrong issuer/audience, expired/replayed code.
- Concurrent double exchange chỉ một thành công.
- Revoke/role change rồi dùng token cũ bị chặn trước business query.
- CSRF refresh/logout, refresh reuse/family revoke, cookies không gửi sang sibling tenant.
- Frontend tenant switch xóa tenant-specific query cache và access token cũ.

