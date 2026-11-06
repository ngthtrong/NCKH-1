# Sơ đồ Chương 2

- `drawio/`: 16 nguồn Draw.io có thể chỉnh sửa.
- `png/`: 16 ảnh xuất và các ảnh tổng quan/xem nhanh.
- `svg/`: 16 ảnh vector.
- `tham-chieu-16-hinh/`: Mermaid và tài liệu tham chiếu.
- `scripts/`: công cụ tạo, xuất và kiểm tra hình.

[Xem toàn bộ hình](xem-tat-ca.html) · [Danh mục](danh-muc-hinh.md) · [Xem nhanh](png/xem-nhanh.png).

Sau khi cập nhật PNG/SVG, tạo lại danh mục và trình xem từ các file hiện tại:

```powershell
python diagrams/scripts/install_gallery.py --gallery-only
```

Khi tạo lại toàn bộ từ bộ nguồn sinh trong `_build/`, chuỗi lệnh vẫn dùng cùng cấu trúc thư mục đầu ra:

```powershell
python diagrams/scripts/export_diagrams.py final
python diagrams/scripts/install_gallery.py
```
