# Sổ bằng chứng báo cáo sơ bộ — 09/10/2026

Nền mã ứng dụng: `e829f73` (`main`). Các thay đổi report đã tồn tại trước và được tiếp tục trong working tree. Đây là hồ sơ kỹ thuật/phương pháp, không phải raw measurements hoặc quyết định thông qua cổng nghiên cứu.

Đường dẫn source/test dùng để mô tả hiện thực hoặc thiết kế case; kết quả runtime phải đọc evidence tương ứng. Mọi skip và provenance chưa xác lập được giữ rõ.

## E01 — Baseline và nguồn yêu cầu

- Loại: `SOURCE`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [resource/thuyetMinhSaasMultiTenancy.md](../../resource/thuyetMinhSaasMultiTenancy.md), [docs/research/srs.md](../../docs/research/srs.md), [docs/research/permission-matrix.md](../../docs/research/permission-matrix.md), [docs/PROJECT_STATUS.md](../../docs/PROJECT_STATUS.md).
- Mệnh đề/kết quả: Checkout main; working tree report đã có thay đổi. Thuyết minh ghi hai khoảng thời gian khác nhau.
- Skip: Không áp dụng.
- Giới hạn: Yêu cầu/phạm vi từ hồ sơ; thời hạn và phần mở rộng học thuật chưa được xác nhận. Không coi status runtime cũ là hiện tại.

## E02 — Protocol và quản trị nghiên cứu

- Loại: `SOURCE`.
- Ngày: 2026-08-25; đọc lại 2026-10-09.
- Phiên bản: UNESTABLISHED.
- Nguồn: [docs/research/protocol.md](../../docs/research/protocol.md), [docs/research/literature-search-log.md](../../docs/research/literature-search-log.md), [docs/research/traceability-matrix.md](../../docs/research/traceability-matrix.md).
- Mệnh đề/kết quả: Protocol 0.1 giữ RQ1–RQ4 và baseline Pool/Silo; note yêu cầu phụ lục cho phép đo ba placement.
- Skip: Không áp dụng.
- Giới hạn: Chưa khóa tìm kiếm và chưa có dữ liệu người dùng; báo cáo không sửa hồi tố protocol.

## E03 — Artifact Surefire có sẵn trước lượt viết

- Loại: `ARTIFACT`.
- Ngày: Quan sát 2026-10-09; mtime 2026-09-24 Asia/Taipei.
- Phiên bản: UNESTABLISHED.
- Nguồn: [apps/api/target/surefire-reports](../../apps/api/target/surefire-reports).
- Mệnh đề/kết quả: Artifact cũ 106 test, 0 failure/error, 47 skip: 59 thực thi. Đã lưu bản sao trong /tmp trước kiểm tra mới.
- Skip: 47: Docker không khả dụng.
- Giới hạn: Mtime không chứng minh ngày chạy hoặc commit; XML trong target sau lượt mới đã bị thay bằng kết quả E04.

## E04 — Kiểm tra backend mới và môi trường hiện tại

- Loại: `NEW_TECHNICAL_CHECK`.
- Ngày: 2026-10-09 11:13:19 +08:00.
- Phiên bản: e829f73; không có diff apps.
- Nguồn: [docs/testing/preliminary-report-2026-10-09.md](../../docs/testing/preliminary-report-2026-10-09.md), [docs/testing/preliminary-report-2026-10-09.json](../../docs/testing/preliminary-report-2026-10-09.json).
- Mệnh đề/kết quả: Fresh compile 121 source + 27 test source; test goal đạt: 106 tổng, 59 thực thi, 47 skip, 0 failure/error. Maven/test runtime Java 21.0.12.1; compiler javac 25.0.4.1 fork với --release 21.
- Skip: 47: disabledWithoutDocker.
- Giới hạn: Verify chưa đạt do thiếu Maven plugin offline. Compiler trong runtime 21 báo release 21 unsupported, nên dùng compiler fork đã ghi rõ. Frontend/E2E không chạy vì thiếu Node/runtime stack.

## E05 — Checkpoint EXT ba placement

- Loại: `HISTORICAL`.
- Ngày: 2026-09-08 UTC.
- Phiên bản: Working tree sau c226676; không gán HEAD hiện tại.
- Nguồn: [docs/testing/extension-local-2026-09-08.md](../../docs/testing/extension-local-2026-09-08.md).
- Mệnh đề/kết quả: Application V8, backend 96/96 (skip 0), frontend 16, Playwright 3 theo biên bản; schema isolation/upgrade local.
- Skip: Backend 0 theo biên bản.
- Giới hạn: Kết quả lịch sử local; extension không tự là phạm vi học thuật đã duyệt hoặc runtime hôm nay.

## E06 — Checkpoint nhắc deadline V12

- Loại: `HISTORICAL`.
- Ngày: Nội dung 2026-09-19 UTC+7; tên file 2026-09-18.
- Phiên bản: an_upgrade_features theo biên bản; SHA chưa ghi.
- Nguồn: [docs/testing/deadline-reminders-2026-09-18.md](../../docs/testing/deadline-reminders-2026-09-18.md).
- Mệnh đề/kết quả: Biên bản ghi deadline integration 6/6, backend 106, frontend 22, E2E 3, application V12; kiểm tra stale và exact assignee.
- Skip: Tổng skip không ghi riêng.
- Giới hạn: Phân biệt ngày nội dung/tên file; không suy 106/106 pass hiện tại, không có SMTP Internet/VAPID thật.

## E07 — P0 baseline local

- Loại: `HISTORICAL`.
- Ngày: 2026-08-26.
- Phiên bản: Theo biên bản; không liên kết HEAD hiện tại.
- Nguồn: [docs/testing/p0-verification-2026-08-26.md](../../docs/testing/p0-verification-2026-08-26.md).
- Mệnh đề/kết quả: Baseline Pool/Silo, migration/role/RLS, API/Compose và k6 smoke theo hồ sơ.
- Skip: Theo từng lệnh trong biên bản.
- Giới hạn: Smoke timing không phải số đo nghiên cứu; trạng thái stack khi chốt không được giả định còn nguyên.

## E08 — P1 provisioning và storage recovery

- Loại: `HISTORICAL`.
- Ngày: 2026-08-31.
- Phiên bản: Theo từng biên bản, không gán một SHA chung.
- Nguồn: [docs/testing/p1-verification-2026-08-31.md](../../docs/testing/p1-verification-2026-08-31.md), [docs/testing/p1-verification-2026-08-31-part-2.md](../../docs/testing/p1-verification-2026-08-31-part-2.md).
- Mệnh đề/kết quả: Hồ sơ ghi MinIO dead letter attempt 5/requeue riêng Pool–Silo, force-kill JVM sau các ranh giới, lease recovery, rollback lỗi lặp và manual retry.
- Skip: Theo từng lệnh trong biên bản.
- Giới hạn: Không chạy lại fault injection trong lượt viết; không đại diện availability/durability production.

## E09 — Sàng lọc guard-omission isolation

- Loại: `HISTORICAL_SCREENING`.
- Ngày: 2026-08-31.
- Phiên bản: Nền harness 2b430b7 theo ADR; quan sát lưu trong biên bản lượt 3.
- Nguồn: [docs/testing/p2-preparation-2026-08-31-part-3.md](../../docs/testing/p2-preparation-2026-08-31-part-3.md), [docs/architecture/adrs/0003-pool-isolation-selection.md](../../docs/architecture/adrs/0003-pool-isolation-selection.md), [experiments/spikes/isolation-harness/README.md](../../experiments/spikes/isolation-harness/README.md).
- Mệnh đề/kết quả: Guarded contract 6/6; 18 observation: 6 explicit/Hibernate Pool leak, 3 RLS Pool protected, 9 Silo boundary protected.
- Skip: Theo hồ sơ; không chạy harness mới.
- Giới hạn: Harness pass là phân loại đúng, không đổi leak thành PASS. Measurement/scorecard/hồ sơ loại checksum-backed chưa hoàn tất.

## E10 — N1 tenant context

- Loại: `SOURCE_AND_TEST_DESIGN`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [apps/api/src/main/java/vn/edu/ctu/saas/security/TenantContextFilter.java](../../apps/api/src/main/java/vn/edu/ctu/saas/security/TenantContextFilter.java), [apps/api/src/main/java/vn/edu/ctu/saas/security/TenantHostResolver.java](../../apps/api/src/main/java/vn/edu/ctu/saas/security/TenantHostResolver.java), [apps/api/src/main/java/vn/edu/ctu/saas/tenant/TenantContextHolder.java](../../apps/api/src/main/java/vn/edu/ctu/saas/tenant/TenantContextHolder.java), [apps/api/src/main/java/vn/edu/ctu/saas/tenant/TenantJdbcExecutor.java](../../apps/api/src/main/java/vn/edu/ctu/saas/tenant/TenantJdbcExecutor.java), [apps/api/src/test/java/vn/edu/ctu/saas/security/TenantContextFilterTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/security/TenantContextFilterTest.java), [apps/api/src/test/java/vn/edu/ctu/saas/tenant/TenantContextHolderTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/tenant/TenantContextHolderTest.java).
- Mệnh đề/kết quả: Host/token/status/membership version binding; ThreadLocal finally cleanup; transaction-local set_config và search_path. Unit test hiện có chạy trong E04.
- Skip: Xem E04.
- Giới hạn: Source mô tả cơ chế; chưa có trusted proxy/DNS/TLS Internet được nghiệm thu.

## E11 — N2 datasource và isolation

- Loại: `SOURCE_AND_TEST_DESIGN`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [apps/api/src/main/java/vn/edu/ctu/saas/tenant/DefaultTenantDataSourceResolver.java](../../apps/api/src/main/java/vn/edu/ctu/saas/tenant/DefaultTenantDataSourceResolver.java), [apps/api/src/main/java/vn/edu/ctu/saas/provisioning/TenantDatabaseProvisioner.java](../../apps/api/src/main/java/vn/edu/ctu/saas/provisioning/TenantDatabaseProvisioner.java), [apps/api/src/main/resources/db/migration/application](../../apps/api/src/main/resources/db/migration/application), [apps/api/src/test/java/vn/edu/ctu/saas/isolation/RowLevelSecurityTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/isolation/RowLevelSecurityTest.java), [apps/api/src/test/java/vn/edu/ctu/saas/provisioning/SchemaPerTenantIsolationIntegrationTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/provisioning/SchemaPerTenantIsolationIntegrationTest.java).
- Mệnh đề/kết quả: Ba placement; runtime role/schema/database, migration V1–V12 và guard/RLS.
- Skip: RLS 4 + schema 1 skip trong E04.
- Giới hạn: Runtime privilege cần kiểm tra trên database thật; source không chứng minh mọi deployment đúng.

## E12 — N3 identity và authorization

- Loại: `SOURCE_AND_TEST_DESIGN`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [apps/api/src/main/java/vn/edu/ctu/saas/auth/AuthService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/auth/AuthService.java), [apps/api/src/main/java/vn/edu/ctu/saas/application/ProjectApplicationService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/application/ProjectApplicationService.java), [docs/research/permission-matrix.md](../../docs/research/permission-matrix.md), [apps/api/src/test/java/vn/edu/ctu/saas/application/ProjectAuthorizationIntegrationTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/application/ProjectAuthorizationIntegrationTest.java), [apps/api/src/test/java/vn/edu/ctu/saas/tenant/TenantManagementServiceSecurityTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/tenant/TenantManagementServiceSecurityTest.java).
- Mệnh đề/kết quả: Account chung, tenant-bound session, active membership/security version và project role; deny/IDOR assertions hiện có.
- Skip: 17 project integration skip; management unit thực thi.
- Giới hạn: Chỉ kết luận các case có evidence; không chứng nhận identity production hoặc mọi ô policy.

## E13 — N4 version, outbox, reminder và delivery

- Loại: `SOURCE_AND_TEST_DESIGN`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [apps/api/src/main/java/vn/edu/ctu/saas/application/ProjectApplicationService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/application/ProjectApplicationService.java), [apps/api/src/main/java/vn/edu/ctu/saas/notification/OutboxWorker.java](../../apps/api/src/main/java/vn/edu/ctu/saas/notification/OutboxWorker.java), [apps/api/src/main/java/vn/edu/ctu/saas/notification/DeadlineReminderService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/notification/DeadlineReminderService.java), [apps/api/src/main/java/vn/edu/ctu/saas/notification/NotificationDeliveryWorker.java](../../apps/api/src/main/java/vn/edu/ctu/saas/notification/NotificationDeliveryWorker.java), [apps/api/src/test/java/vn/edu/ctu/saas/notification/DeadlineReminderIntegrationTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/notification/DeadlineReminderIntegrationTest.java).
- Mệnh đề/kết quả: Version predicate, batch transaction/outbox, sổ nhắc hạn, stale recheck và email queue riêng; outbox duyệt tenant tuần tự.
- Skip: 6 deadline integration skip trong E04.
- Giới hạn: Không exactly-once SMTP; không kế thừa SKIP LOCKED provisioning cho outbox; multi-worker còn thiếu.

## E14 — N5 provisioning và tài nguyên

- Loại: `SOURCE_AND_TEST_DESIGN`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [apps/api/src/main/java/vn/edu/ctu/saas/provisioning/ProvisioningJobClaimer.java](../../apps/api/src/main/java/vn/edu/ctu/saas/provisioning/ProvisioningJobClaimer.java), [apps/api/src/main/java/vn/edu/ctu/saas/provisioning/ProvisioningJobCoordinator.java](../../apps/api/src/main/java/vn/edu/ctu/saas/provisioning/ProvisioningJobCoordinator.java), [apps/api/src/main/java/vn/edu/ctu/saas/provisioning/DefaultProvisioningService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/provisioning/DefaultProvisioningService.java), [apps/api/src/main/java/vn/edu/ctu/saas/storage/ResourceService.java](../../apps/api/src/main/java/vn/edu/ctu/saas/storage/ResourceService.java), [apps/api/src/main/java/vn/edu/ctu/saas/security/TenantRateLimitFilter.java](../../apps/api/src/main/java/vn/edu/ctu/saas/security/TenantRateLimitFilter.java), [apps/api/src/test/java/vn/edu/ctu/saas/provisioning/ProvisioningJobClaimerIntegrationTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/provisioning/ProvisioningJobClaimerIntegrationTest.java), [apps/api/src/test/java/vn/edu/ctu/saas/storage/ResourceDeletionOutboxIntegrationTest.java](../../apps/api/src/test/java/vn/edu/ctu/saas/storage/ResourceDeletionOutboxIntegrationTest.java).
- Mệnh đề/kết quả: Atomic claim/lease, compensation, datasource eviction, process-local quota lock và tenant bucket limiter.
- Skip: Integration Docker xem E04.
- Giới hạn: Chưa đo global connection budget, quota/limiter multi-instance hoặc provider thật; pool cap logic chưa là proof hard bound toàn hệ thống.

## E15 — Contract, architecture và workload

- Loại: `SOURCE`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73.
- Nguồn: [docs/api/openapi.yaml](../../docs/api/openapi.yaml), [docs/architecture/overview.md](../../docs/architecture/overview.md), [docs/architecture/adrs/0006-provisioning-and-outbox.md](../../docs/architecture/adrs/0006-provisioning-and-outbox.md), [docs/architecture/adrs/0008-three-placement-bridge.md](../../docs/architecture/adrs/0008-three-placement-bridge.md), [experiments/k6/baseline.js](../../experiments/k6/baseline.js), [experiments/k6/load.js](../../experiments/k6/load.js).
- Mệnh đề/kết quả: API chung; baseline constant-vus + think time; load constant-arrival-rate. ADR thiết kế concurrency khác worker tuần tự.
- Skip: Không áp dụng.
- Giới hạn: Workload đọc chưa là mixed Kanban; protocol ba placement và capability cần đăng ký bổ sung.

## E16 — Frontend và E2E lịch sử

- Loại: `HISTORICAL_AND_ENVIRONMENT`.
- Ngày: 08/09 và 19/09; môi trường đọc lại 09/10/2026.
- Phiên bản: Theo E05/E06.
- Nguồn: [apps/web/package.json](../../apps/web/package.json), [docs/testing/extension-local-2026-09-08.md](../../docs/testing/extension-local-2026-09-08.md), [docs/testing/deadline-reminders-2026-09-18.md](../../docs/testing/deadline-reminders-2026-09-18.md).
- Mệnh đề/kết quả: 16 frontend test ở EXT, 22 ở mốc sau; 3 E2E theo hồ sơ. Node Linux không có trong môi trường hiện tại.
- Skip: Không có lượt frontend/E2E mới.
- Giới hạn: Không tuyên bố contract/lint/test/build hoặc E2E đã chạy lại hôm nay.

## E17 — Xuất bản LaTeX/PDF

- Loại: `NEW_PUBLISHING_CHECK`.
- Ngày: 2026-10-09.
- Phiên bản: e829f73 + working tree report.
- Nguồn: [biên bản hiện tại](../../report/VISUAL_REFRESH_VALIDATION.md), [biên bản trước chỉnh hình thức](../../report/PRELIMINARY_VALIDATION.md), [report/Makefile](../../report/Makefile), [report/scripts/check_template.py](../../report/scripts/check_template.py).
- Mệnh đề/kết quả: Doctor, `all smoke` và `check` đạt; review trực quan bìa, mục lục, 15 sơ đồ, bảng, bibliography và các biểu mẫu được lưu trong biên bản xuất bản.
- Skip: Không áp dụng.
- Giới hạn: Định dạng/build không thay cổng nghiên cứu, đủ trang nội dung hoặc nghiệm thu. Kết quả cuối đọc tại biên bản xuất bản.

