# Kiểm tra kỹ thuật phục vụ báo cáo sơ bộ — 09/10/2026

## Phiên bản và phạm vi

- Nền mã ứng dụng: `e829f73d88beaea24e8cc2e4d71513ce2ee9127e`, nhánh `main`; không sửa `apps/`, API/OpenAPI hoặc migration.
- Nguồn báo cáo đã có diff trước lượt viết; tiếp tục hoàn thiện trong working tree. Diff ban đầu và XML cũ được sao lưu ở `/tmp/nckh-report-baseline-20261009` để bảo toàn trong phiên.
- Đây là kiểm tra phát triển local và xuất bản báo cáo; không phải measured experiment, pilot, SLO, cổng nghiên cứu hoặc nghiệm thu.
- P2 measurement/load/noisy-neighbor/fault injection/provider/VPS/user study không được chạy lại.

## Backend

Kết quả cuối: **106 test tổng, 59 thực thi, 47 skip, 0 failure, 0 error**. Mục tiêu Maven `test` đạt lúc **11:13:19, Asia/Taipei (+08:00)**. Các suite và checksum XML được lưu trong [JSON tổng hợp](preliminary-report-2026-10-09.json); XML/raw log nằm ở đầu ra build/thư mục tạm, không đóng vai trò raw research measurements.

Lệnh thực tế từ `apps/api`:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
MAVEN_USER_HOME=/tmp/nckh-report-maven-home \
/home/ngthtrong/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn \
  -o -B -ntp -Dmaven.repo.local=/tmp/nckh-report-m2 \
  -Dmaven.compiler.fork=true \
  -Dmaven.compiler.executable=/usr/lib/jvm/java-25-openjdk-amd64/bin/javac test
```

Cache Maven được sao chép từ home sang `/tmp`; không tải dependency mới. Maven/test runtime là **Java 21.0.12.1**, compiler fork là **javac 25.0.4.1 với release 21**. Đã xóa riêng đầu ra compiler (`target/classes`, `test-classes`, `maven-status`) trước lượt cuối để biên dịch lại **121 source và 27 test source**. Không thay cấu hình build trong repo.

Các thử nghiệm trước lượt cuối:

1. `clean verify` offline dừng trước test: thiếu `maven-clean-plugin:3.5.0` trong cache.
2. `verify` offline dừng trước test: thiếu `maven-jar-plugin:3.5.1` trong cache.
3. `test` incremental đạt 59 thực thi/47 skip; chưa đủ chứng minh fresh compile nên thực hiện lượt compiler mới.
4. Compiler đi kèm runtime Java 21 trên máy báo `release version 21 not supported`; dùng compiler fork đã ghi ở trên cho lượt cuối.

Do đó **không ghi verify đạt** và không mô tả đây là build hoàn toàn bằng JDK 21. Cần chạy verification chuẩn trên JDK 21 đầy đủ cùng Docker trước baseline tích hợp cuối.

47 skip đều do `disabledWithoutDocker`: project authorization 17; customization 3; RLS 4; deadline 6; payment concurrency 2; provisioning claimer 4; coordinator 4; schema isolation 1; provisioning failure injection 1; resource deletion outbox 5. Các assertion SQL/MinIO/crash tương ứng chưa được kiểm chứng lại ở lượt này.

## Frontend và E2E

Không thực thi contract/lint/unit/build/E2E mới: Node.js Linux không có; npm từ Windows báo không xác định được thư mục Node. Không khởi động stack hoặc chạy E2E. Số 16/22 frontend test và 3 E2E chỉ được trích từ checkpoint lịch sử đúng ngày/phiên bản.

## Xuất bản

`make -C report doctor` đạt với XeLaTeX/Biber/Poppler và bốn kiểu Times New Roman. Kết quả `all smoke`, `check`, số trang và review trực quan cuối được ghi tại [PRELIMINARY_VALIDATION.md](../../report/PRELIMINARY_VALIDATION.md). Build đạt không thay kiểm chứng ứng dụng hoặc cổng nghiên cứu.
