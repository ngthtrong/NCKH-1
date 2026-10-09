# Nhật ký nghiên cứu

Không sửa lịch sử; thêm mục mới ở đầu bảng. Thời gian dùng UTC.

| Thời gian | Người/agent | Hoạt động | Đầu vào | Đầu ra | Sai lệch giao thức/quyết định |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 | Codex | Chỉnh hình thức báo cáo và lưu checkpoint theo yêu cầu người dùng | Nguồn report và bằng chứng hiện có | 15 hình TikZ, nguồn không banner/đường dẫn repo, `session-checkpoint-2026-10-09-visual-refresh.md` | Bản PDF chính build đạt; xuất đồng bộ và check cuối còn chờ; không thay dữ liệu hay chạy lại thực nghiệm |
| 2026-10-09 | Codex | Hoàn thiện báo cáo sơ bộ theo yêu cầu mới: chuỗi bài toán → phương án → tiêu chí → hiện thực → bằng chứng → mục báo cáo; giữ RQ và bổ sung hồ sơ nguồn/evidence | `main`/`e829f73`, thuyết minh, source/test/contract, biên bản lịch sử; working tree report có diff sẵn | `report/`, `preliminary-report-evidence.md`, `preliminary-report-traceability.md`, `preliminary-report-sources.md`, biên bản kỹ thuật mới | Không sửa protocol/ADR Accepted hoặc chạy lại P2/load/fault/user study; 59 backend test thực thi, 47 Docker skip; verify/frontend chưa đóng; compiler fork release 21 được ghi rõ |
| 2026-08-25 | Codex | Thiết lập protocol, truy vết, SRS, khảo sát nguồn công khai và đặc tả kiến trúc ban đầu | `resource/plan.md`, `resource/thuyetMinhSaasMultiTenancy.md`, nguồn chính thức/DOI | `docs/research`, `docs/architecture` | Chưa chạy tìm kiếm đầy đủ từng CSDL; không công bố số lượng PRISMA |

## Mẫu mục mới

| `YYYY-MM-DDThh:mmZ` | Tên | Mô tả hành động có thể tái lập | Commit/run/query/input | File hoặc run ID | `NONE` hoặc mô tả + lý do + ảnh hưởng |
