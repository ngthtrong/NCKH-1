# Ma trận quyền

## 1. Mô hình hiệu lực

Authorization cho application plane là giao của bốn điều kiện:

```text
tenant is ACTIVE
AND current TenantMembership is ACTIVE
AND host/token/route resolve the same tenant
AND ProjectMembership grants the requested action (khi tài nguyên thuộc project)
```

Các tính năng mở rộng còn phải thỏa:

```text
placement supports capability
AND SystemAdmin granted capability
AND TenantOwner/TenantAdmin enabled capability
```

Tier/gói giá không tự cấp capability trong baseline mở rộng. Capability không thay thế tenant/project role và frontend chỉ dùng kết quả effective để hiển thị; backend/worker vẫn là enforcement point.

`TenantOwner`/`TenantAdmin` không tự động đọc nội dung project. Đây là lựa chọn least privilege, nhất quán với việc Base Wework tách App Admin khỏi quyền setup project. Khi cần thao tác nội dung, họ phải có `ProjectMembership` như user khác. `SystemAdmin` chỉ quản trị control plane; support impersonation/break-glass ngoài phạm vi v1.

Ký hiệu: `A` cho phép; `D` từ chối; `C` có điều kiện ghi ở ghi chú. Server là enforcement point.

## 2. Quyền cấp hệ thống/control plane

| Hành động | Anonymous | Authenticated user | SystemAdmin | TenantOwner | TenantAdmin | TenantMember |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Đăng ký/đăng nhập | A | A | A | A | A | A |
| Liệt kê membership của chính mình | D | A | A | A | A | A |
| Yêu cầu tạo tenant | D | A | A | A | A | A |
| Xem tất cả tenant/payment/job metadata | D | D | A | D | D | D |
| Retry provisioning job hợp lệ | D | D | A | D | D | D |
| Suspend/unsuspend tenant vì vận hành | D | D | A | D | D | D |
| Xem capability của mọi tenant | D | D | A | D | D | D |
| Cấp/thu hồi capability trong giới hạn placement | D | D | A | D | D | D |
| Đổi placement sau khi tenant có dữ liệu | D | D | D | D | D | D |
| Đọc project/task/resource của tenant bất kỳ | D | D | D | D | D | D |

Ô cuối `D` có nghĩa không có quyền **chỉ nhờ role đang xét**; Owner/Admin/Member có thể đọc nếu đồng thời có project role tương ứng.

## 3. Quyền cấp tenant

| Hành động | Owner | Admin | Member | Ghi chú |
| --- | :---: | :---: | :---: | --- |
| Xem tenant profile/tier/placement | A | A | A | Member không thấy payment secret/raw payload |
| Sửa tên/cấu hình tenant | A | A | D | Slug/placement không đổi sau activation theo baseline |
| Xem capability grant/enable của tenant | A | A | A | Không trả credential/schema vật lý |
| Bật/tắt capability đã được SystemAdmin cấp | A | A | D | Capability phải được placement hỗ trợ; tắt Approval có precondition an toàn |
| Cấu hình màu/logo branding | A | A | D | Cần `BRANDING`; logo chỉ định dạng/size cho phép và có tenant namespace |
| Xem billing/payment status | A | D | D | Admin chỉ xem provisioning health tối thiểu nếu cần |
| Quản lý tier/billing | A | D | D | Sandbox v1 |
| Mời member | A | A | D | Không mời Owner trực tiếp |
| Đổi role Member↔Admin | A | A | D | Admin không đổi Owner; không tự nâng mình thành Owner |
| Revoke Member/Admin | A | A | D | Admin không revoke Owner/peer Admin nếu policy yêu cầu; baseline cho phép revoke Member, Owner xử lý Admin |
| Chuyển ownership | A | D | D | Target là active member; transaction nguyên tử |
| Suspend/delete tenant do chủ sở hữu | A | D | D | Soft lifecycle, confirm + audit |
| Xem aggregate storage usage | A | A | D | Không lộ filename/content nếu thiếu project role |
| Tạo project | A | A | A | Creator tự thành ProjectManager |
| Liệt kê project | C | C | C | Chỉ project có ProjectMembership |

### 3.1 Giới hạn capability theo placement

| Placement | Branding | Custom Data | Approvals | Automation |
| --- | :---: | :---: | :---: | :---: |
| `POOL` — Shared DB, Shared Schema | C | D | D | D |
| `SCHEMA_PER_TENANT` — Shared DB, Separate Schema | C | C | D | D |
| `SILO_DATABASE` — Separate DB | C | C | C | C |

`C` ở bảng này nghĩa là placement cho phép cấp, không có nghĩa tenant tự động được dùng. Branding được grant mặc định; mọi capability vẫn cần trạng thái enabled. Gói giá không tham gia phép tính này ở bản đầu.

## 4. Quyền cấp project

| Hành động | Manager | Member | Viewer |
| --- | :---: | :---: | :---: |
| Xem project/board/task/comment | A | A | A |
| Sửa/archive/restore/xóa project | A | D | D |
| Quản lý ProjectMembership/role | A | D | D |
| Tạo/sửa/xóa/reorder board/column | A | D | D |
| Tạo task/subtask | A | A | D |
| Sửa/move/complete/reorder task | A | A | D |
| Xóa task | A | D | D |
| Gán task cho active project member | A | A | D |
| Bình luận | A | A | D |
| Sửa/xóa comment của chính mình | A | A | D |
| Moderation comment người khác | A | D | D |
| Upload/tạo link resource | A | A | D |
| Link/unlink resource với task | A | A | D |
| Tải resource đã authorize | A | A | A |
| Xóa resource | A | C | D |
| Xem định nghĩa và dữ liệu tùy biến đã có | A | A | A |
| Tạo/sửa/xóa mềm/phục hồi định nghĩa bảng hoặc field | A | D | D |
| Tạo/sửa record bảng nghiệp vụ | A | A | D |
| Xóa record bảng nghiệp vụ | A | D | D |
| Xem field Task và giá trị | A | A | A |
| Sửa giá trị field Task | A | A | D |
| Xem cấu hình/lịch sử phê duyệt | A | A | A |
| Tạo/sửa/bật/tắt workflow phê duyệt | A | D | D |
| Gửi task để duyệt | A | A | D |
| Thu hồi lượt đang chờ do chính mình gửi | A | A | D |
| Thu hồi lượt đang chờ của người khác | A | D | D |
| Quyết định ở bước hiện hành | C | C | D |
| Thay approver ở bước chưa hoàn tất | A | D | D |
| Xem rule/lịch sử automation | A | A | A |
| Tạo rule mới hoặc tắt rule | A | D | D |

Điều kiện `Member` xóa resource: chỉ resource do chính user upload, chưa bị Manager khóa/retention và không vi phạm link còn sử dụng. Xóa vật lý là job riêng.

Các hàng Custom Data cần capability `CUSTOM_DATA` để mutation; sau khi capability bị thu hồi, dữ liệu đã có vẫn đọc được theo project role. Chỉ Manager quản lý cấu trúc và xóa record; Manager/Member ghi giá trị. Owner/Admin không có project role vẫn bị từ chối.

Các hàng phê duyệt cần capability `APPROVALS`. Quyết định còn yêu cầu user nằm trong snapshot approver của bước hiện hành, đang là active Manager/Member, chưa quyết định và không phải người gửi. Chế độ `ANY`/`ALL`, optimistic version và trạng thái lượt là điều kiện server-side. Người gửi hoặc Manager được thu hồi; chỉ Manager thay approver.

Các hàng automation cần capability `AUTOMATION`. Manager cấu hình đúng một trigger/một action; Viewer/Member chỉ xem theo project role. Worker kiểm tra lại capability, rule/project/recipient trước side effect.

## 5. Quyền đối với notification và audit

| Hành động | Owner/Admin | Manager | Member | Viewer | SystemAdmin |
| --- | :---: | :---: | :---: | :---: | :---: |
| Xem notification của chính mình | A | A | A | A | A |
| Đổi preference của chính mình | A | A | A | A | A |
| Xem audit tenant-level auth/membership | A | D | D | D | C |
| Xem audit project mình quản lý | C | A | D | D | C |
| Xem operational audit payment/provisioning | C | D | D | D | A |
| Sửa/xóa audit event | D | D | D | D | D |

`SystemAdmin` chỉ thấy operational/control-plane audit. Project audit chỉ hiện nếu có một quy trình break-glass được thiết kế sau v1; hiện tại `D/C` không cấp API đọc nội dung.

## 6. Ma trận test bắt buộc

Mỗi hành động mutation có ít nhất:

1. allow test cho role thấp nhất được phép;
2. deny test cho role cao nhất không được phép;
3. deny test khi ProjectMembership thiếu/revoked;
4. deny test với ID cùng loại ở tenant khác;
5. deny test khi host và token khác tenant;
6. deny test khi tenant suspended;
7. với job nền, test tenant context thiếu và tenant context sai.
8. với tính năng mở rộng, deny test khi placement không hỗ trợ, capability chưa grant, bị disabled hoặc vừa revoke;
9. với Schema placement, deny cả truy vấn dùng UUID chéo tenant và truy vấn ghi rõ tên schema khác;
10. với approval, test submitter tự duyệt, approver mất membership, bước không hiện hành và hai quyết định đồng thời;
11. với automation, test event trùng/retry, rule tắt, recipient mất quyền và event do automation sinh ra.

Không dùng HTTP status để suy rằng không rò rỉ: response body, timing hợp lý, log, notification và side effect database/storage đều phải được kiểm tra.
