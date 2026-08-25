# ADR-0005: ResourceStorage adapter; MinIO là mặc định có điều kiện

- **Trạng thái:** Proposed
- **Ngày:** 2026-08-25
- **RQ/yêu cầu:** RQ4; FR-50..55, SEC-13

## Bối cảnh

Ứng dụng cần resource dùng lại cho nhiều task, namespace tenant, quota và download có thời hạn. Filesystem nhẹ nhưng URL thời hạn/scale/backup/permission phải tự xây; S3-compatible object storage cung cấp primitive phù hợp nhưng tăng footprint VPS.

## Hợp đồng

```text
reserveUpload(tenantNamespace, resourceId, constraints) -> UploadContract
verifyAndFinalize(tenantNamespace, objectKey, expectedMetadata) -> StoredObject
signDownload(tenantNamespace, objectKey, ttl) -> SignedLocation
delete(tenantNamespace, objectKey, idempotencyKey)
```

Object key do server sinh: `<tenant-uuid>/<resource-uuid>/<opaque-name>`. Authorization và quota ở application service trước adapter; adapter vẫn từ chối key ngoài namespace. Metadata không lưu signed URL dài hạn.

## Quy tắc chọn

Spike `MinioResourceStorage` và `FilesystemResourceStorage` bằng cùng contract tests: path/key traversal, cross-prefix, expired URL, concurrent quota, incomplete upload, delete retry, backup/restore và CPU/RAM/disk footprint. Loại backend không bảo đảm namespace, quota hoặc URL thời hạn an toàn. Chấm security/testability 35%, backup/ops 25%, resource footprint 20%, portability 10%, implementation effort 10%. Nếu đồng điểm, chọn MinIO.

Trong khi chờ, MinIO là Compose candidate và filesystem chỉ adapter local/test; đây chưa phải kết quả thắng.

## Xác minh

- Không signed URL khi user thiếu ProjectMembership hoặc resource khác tenant.
- URL hết hạn/revoke policy được test; log không chứa full URL/query signature.
- Race upload không vượt tenant quota.
- Restore metadata+object giữ đúng mapping tenant/resource.
- ADR Accepted phải liên kết raw footprint, contract test và scorecard.

