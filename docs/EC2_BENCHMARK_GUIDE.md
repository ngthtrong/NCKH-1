# HƯỚNG DẪN THỰC THI THỰC NGHIỆM TRÊN AWS EC2 (m7i-flex.large)

Tài liệu này hướng dẫn cách thiết lập và chạy toàn bộ bộ kịch bản kiểm định đa thuê bao (Multi-tenant Level 3) trên máy chủ AWS EC2 phiên bản `m7i-flex.large` (2 vCPU, 8 GiB RAM), khớp 100% với quy mô trong thuyết minh đề tài:
- **Số lượng thuê bao:** 5 tổ chức thuê bao giả lập (`t-acme`, `pool-demo`, `t-lotus`, `t-finance`, `t-aggressor`).
- **Số lượng người dùng hoạt động đồng thời:** 10 đến 20 tài khoản / thuê bao (Tổng cộng: **80 Virtual Users**).

---

## Bước 1: Khởi tạo máy ảo EC2 trên AWS

1. **Instance Type:** `m7i-flex.large` (hoặc `c7i.large`, `t4g.xlarge` tương đương).
2. **Hệ điều hành:** Ubuntu 24.04 LTS (x86_64).
3. **Dung lượng ổ đĩa:** 30 GiB gp3.
4. **Security Group (Inbound rules):**
   - SSH (Port 22): My IP
   - HTTP (Port 80): All (nếu cần xem UI từ bên ngoài)
   - Custom TCP (Port 8080): All (cho API)

---

## Bước 2: Cài đặt môi trường máy chủ (Chạy 1 lần duy nhất)

Sau khi SSH vào máy chủ EC2 (`ssh -i key.pem ubuntu@<ec2-ip>`), chạy lệnh sau để cài đặt Docker, Docker Compose và Node.js:

```bash
# Cập nhật hệ thống và cài đặt công cụ cơ bản
sudo apt-get update && sudo apt-get install -y curl git python3 python3-pip

# Cài đặt Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra Docker
docker compose version
```

---

## Bước 3: Clone Repository và Chạy Thực nghiệm

```bash
# 1. Clone repository
git clone https://github.com/ngthtrong/NCKH-1.git
cd NCKH-1

# 2. Chuyển sang nhánh an_upgrade_features
git checkout an_upgrade_features

# 3. Phân quyền và Chạy kịch bản thực nghiệm tự động
chmod +x scripts/*.sh
bash scripts/run-ec2-benchmark.sh
```

*(Mặc định thời gian chạy đo là 60 giây. Nếu muốn chạy dài hơn, ví dụ 2 phút: `bash scripts/run-ec2-benchmark.sh 120s`)*

---

## Bước 4: Xem và Lấy Kết Quả Điền vào Báo Cáo

Sau khi script hoàn tất, toàn bộ kết quả đã được tự động tính toán, phân tích và định dạng sẵn tại:

```bash
cat experiments/results/ec2/CHAPTER_5_TABLES.md
```

Tệp này chứa:
1. **Bảng 5.3 (Hiệu năng):** Bảng số liệu hoàn chỉnh đối chiếu thông lượng (RPS), độ trễ p50, p95, p99 và tỷ lệ thành công của từng nhóm thuê bao khi có 80 user đồng thời.
2. **Bảng 5.2 (Bảo mật & Cô lập):** Bảng số liệu chặn JWT giả mạo, kiểm tra MDC và FORCE RLS.
3. **Đoạn văn mẫu:** Các câu chữ đã điền sẵn số liệu chính xác để dán thẳng vào các đoạn `[...]` trong Chương 5 của `Report (1).docx`.
