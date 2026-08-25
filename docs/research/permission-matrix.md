# Ma trận quyền

## 1. Mô hình hiệu lực

Authorization cho application plane là giao của bốn điều kiện:

```text
tenant is ACTIVE
AND current TenantMembership is ACTIVE
AND host/token/route resolve the same tenant
AND ProjectMembership grants the requested action (khi tài nguyên thuộc project)
```

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
| Đọc project/task/resource của tenant bất kỳ | D | D | D | D | D | D |

Ô cuối `D` có nghĩa không có quyền **chỉ nhờ role đang xét**; Owner/Admin/Member có thể đọc nếu đồng thời có project role tương ứng.

## 3. Quyền cấp tenant

| Hành động | Owner | Admin | Member | Ghi chú |
| --- | :---: | :---: | :---: | --- |
| Xem tenant profile/tier/placement | A | A | A | Member không thấy payment secret/raw payload |
| Sửa tên/logo/cấu hình tenant | A | A | D | Slug/placement không đổi sau activation theo baseline |
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

Điều kiện `Member` xóa resource: chỉ resource do chính user upload, chưa bị Manager khóa/retention và không vi phạm link còn sử dụng. Xóa vật lý là job riêng.

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

Không dùng HTTP status để suy rằng không rò rỉ: response body, timing hợp lý, log, notification và side effect database/storage đều phải được kiểm tra.

