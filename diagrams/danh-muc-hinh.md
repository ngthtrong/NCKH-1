# Danh mục 27 hình trong Báo cáo NCKH (Đã bổ sung chi tiết ST/MI/MU/MT và 4 Cấp độ trưởng thành)

1. **Hình 1.1 Các hướng phát triển của mô hình chia sẻ tài nguyên** (Mục `1.1.1` — file `hinh_1_1_tien_trinh.png`)
   - *Ý nghĩa:* Các mô hình có thể cùng tồn tại; mũi tên biểu diễn sự kế thừa ý tưởng.
2. **Hình 1.2 Chi phí sở hữu (TCO) của nhà cung cấp dịch vụ theo quy mô thuê bao** (Mục `1.1.2` — file `hinh_1_2_tco.png`)
   - *Ý nghĩa:* Trục hoành là số tổ chức thuê dịch vụ; trục tung là tổng chi phí của nhà cung cấp; n* là điểm giao cân bằng chi phí.
3. **Hình 1.3 Sơ đồ chi tiết mô hình Đơn thuê bao (Single-Tenant – ST)** (Mục `1.3.1` — file `hinh_1_3_st.png`)
   - *Ý nghĩa:* Mỗi tổ chức thuê bao sử dụng App Server Instance và Database riêng biệt ở tầng đang xét.
4. **Hình 1.4 Sơ đồ chi tiết mô hình Đa instance (Multi-Instance – MI)** (Mục `1.3.2` — file `hinh_1_4_mi.png`)
   - *Ý nghĩa:* MI phản ánh số lượng bản ứng dụng đang chạy, có thể gắn riêng theo tenant hoặc cùng chia sẻ một nguồn dữ liệu.
5. **Hình 1.5 Sơ đồ chi tiết mô hình Đa người dùng (Multi-User – MU)** (Mục `1.3.3` — file `hinh_1_5_mu.png`)
   - *Ý nghĩa:* Nhiều cá nhân truy cập trên cùng một ứng dụng nhưng không hình thành các không gian tổ chức thuê bao độc lập.
6. **Hình 1.6 Sơ đồ chi tiết mô hình Đa thuê bao (Multi-Tenant – MT)** (Mục `1.3.4` — file `hinh_1_6_mt.png`)
   - *Ý nghĩa:* Nhiều tổ chức thuê bao dùng chung App Server Instance và Database với ngữ cảnh, Metadata và phân vùng dữ liệu riêng theo Tenant ID.
7. **Hình 1.7 Sơ đồ so sánh tổng quát bốn mô hình ST, MI, MU và MT** (Mục `1.3.5` — file `hinh_1_7_st_mi_mu_mt.png`)
   - *Ý nghĩa:* Tổng hợp sự khác biệt về đơn vị định danh, mức chia sẻ App Server Instance, Database và khả năng tùy biến theo tổ chức.
8. **Hình 1.8 Sơ đồ kiến trúc Cấp độ 1 – Ad Hoc / Custom** (Mục `1.4.1` — file `hinh_1_8_cap_do_1.png`)
   - *Ý nghĩa:* Mỗi khách hàng sử dụng một biến thể mã nguồn riêng cùng App Server Instance và Database độc lập.
9. **Hình 1.9 Sơ đồ kiến trúc Cấp độ 2 – Configurable** (Mục `1.4.2` — file `hinh_1_9_cap_do_2.png`)
   - *Ý nghĩa:* Tất cả khách hàng dùng chung một Codebase chuẩn nhưng tùy biến bằng file cấu hình trước khi chạy trên các Instance và Database riêng.
10. **Hình 1.10 Sơ đồ kiến trúc Cấp độ 3 – Configurable, Multi-Tenant-Efficient (Mục tiêu đề tài)** (Mục `1.4.3` — file `hinh_1_10_cap_do_3.png`)
   - *Ý nghĩa:* Một App Server Instance và một Database dùng chung phục vụ đồng thời nhiều thuê bao; tùy biến lúc chạy qua Metadata và cô lập logic bằng Tenant ID.
11. **Hình 1.11 Sơ đồ kiến trúc Cấp độ 4 – Scalable, Configurable, Multi-Tenant-Efficient (Hướng phát triển)** (Mục `1.4.4` — file `hinh_1_11_cap_do_4.png`)
   - *Ý nghĩa:* Mở rộng kiến trúc Cấp độ 3 bằng bộ cân bằng tải, cụm nhiều App Server Instances/Pods co giãn ngang và cơ sở dữ liệu phân tán.
12. **Hình 1.12 Sơ đồ so sánh tổng quát bốn cấp độ trưởng thành kiến trúc SaaS** (Mục `1.4.5` — file `hinh_1_12_truong_thanh.png`)
   - *Ý nghĩa:* Tổng hợp tiến trình từ Cấp độ 1 đến Cấp độ 4; đề tài định vị mục tiêu thực nghiệm ở Cấp độ 3 và đặt Cấp độ 4 làm hướng phát triển.
13. **Hình 1.13 Quan hệ ba tầng trong cung ứng dịch vụ đa thuê bao** (Mục `1.5.1` — file `hinh_1_13_ba_tang.png`)
   - *Ý nghĩa:* Ba tầng biểu diễn vai trò từ tổ chức thuê dịch vụ, phần mềm của nhà cung cấp đến các Web/App/DB Server Instance thực thi.
14. **Hình 1.14 Mô hình tổng thể ba tầng và các cơ chế kiểm soát xuyên tầng** (Mục `1.5.2` — file `hinh_1_14_tich_hop.png`)
   - *Ý nghĩa:* Đường liền là quan hệ phục vụ, nét đứt là phạm vi kiểm soát xuyên tầng áp dụng trong kiến trúc Cấp độ 3.
15. **Hình 1.15 Ngăn xếp chín tầng nguyên bản của Kabbedijk và cộng sự (vẽ lại theo [3])** (Mục `1.5.3` — file `hinh_1_15_ngan_xep_goc.png`)
   - *Ý nghĩa:* So sánh phạm vi phân tích của ngăn xếp nguyên bản và bản cập nhật; không phải thang trưởng thành SaaS.
16. **Hình 1.16 Ngăn xếp chín tầng cập nhật cho kiến trúc Cloud-Native do nhóm đề xuất** (Mục `1.5.3` — file `hinh_1_16_ngan_xep_cap_nhat.png`)
   - *Ý nghĩa:* So sánh phạm vi phân tích của ngăn xếp nguyên bản và bản cập nhật; không phải thang trưởng thành SaaS.
17. **Hình 2.1 Tài nguyên ứng dụng và dữ liệu dành riêng theo tenant (Mô hình Silo)** (Mục `2.1.2` — file `hinh_2_1_silo.png`)
   - *Ý nghĩa:* Quan hệ mũi tên xác định App Server Instance và nguồn dữ liệu phục vụ từng tenant.
18. **Hình 2.2 Ứng dụng và bảng dữ liệu dùng chung có nhận biết tenant (Mô hình Pool)** (Mục `2.1.2` — file `hinh_2_2_pool.png`)
   - *Ý nghĩa:* Quan hệ mũi tên xác định App Server Instance và nguồn dữ liệu phục vụ từng tenant.
19. **Hình 2.3 Chia sẻ ứng dụng và phân tách nguồn dữ liệu (Mô hình Bridge)** (Mục `2.1.3` — file `hinh_2_3_bridge.png`)
   - *Ý nghĩa:* Quan hệ mũi tên xác định App Server Instance và nguồn dữ liệu phục vụ từng tenant.
20. **Hình 2.4 Phối hợp tài nguyên dùng chung và dành riêng (Mô hình Hybrid)** (Mục `2.1.3` — file `hinh_2_4_hybrid.png`)
   - *Ý nghĩa:* Quan hệ mũi tên xác định App Server Instance và nguồn dữ liệu phục vụ từng tenant.
21. **Hình 3.1 Nhóm ca sử dụng theo vai trò của ứng dụng** (Mục `3.1.2` — file `hinh_3_1_use_case.png`)
   - *Ý nghĩa:* Đường nối là quan hệ tham gia chức năng; quyền chi tiết được xác định trong ma trận phân quyền.
22. **Hình 3.2 Kiến trúc thành phần của ứng dụng Cấp độ 3 được đề xuất** (Mục `3.2.1` — file `hinh_3_2_kien_truc.png`)
   - *Ý nghĩa:* Các khối trong backend là mô-đun cùng một App Server Instance; phục vụ đồng thời nhiều tenant trên một Database chung.
23. **Hình 3.3 Luồng tạo thẻ có xác lập và giải phóng ngữ cảnh tenant** (Mục `3.2.1` — file `hinh_3_3_luong_yeu_cau.png`)
   - *Ý nghĩa:* Luồng hợp lệ; lỗi xác thực bị từ chối trước nghiệp vụ; mọi nhánh đều dọn ngữ cảnh.
24. **Hình 3.4 Lược đồ logic các thực thể dữ liệu cốt lõi** (Mục `3.2.2` — file `hinh_3_4_erd.png`)
   - *Ý nghĩa:* Một workspace tương ứng một tenant; FK nghiệp vụ có cùng tenant_id; ký hiệu 1:N biểu diễn lực lượng quan hệ.
25. **Hình 3.5 Cập nhật và áp dụng metadata theo tenant khi ứng dụng đang chạy** (Mục `3.3.2` — file `hinh_3_5_metadata.png`)
   - *Ý nghĩa:* Thay đổi cấu hình có hiệu lực tại runtime trên cùng instance; backend vẫn kiểm tra quy tắc khi gọi API trực tiếp.
26. **Hình 3.6 Thiết kế giao diện quản lý công việc theo workspace** (Mục `3.4.2` — file `hinh_3_6_giao_dien.png`)
   - *Ý nghĩa:* Wireframe đề xuất; không được dùng như bằng chứng ứng dụng đã chạy hoặc đã vượt kiểm thử.
27. **Hình 3.7 Mô hình triển khai ứng dụng phục vụ nhiều tenant trên máy chủ thử nghiệm** (Mục `3.5.1` — file `hinh_3_7_trien_khai.png`)
   - *Ý nghĩa:* Phân biệt rõ Web Server Instance, Application Server Instance và Database Server Instance dùng chung.
