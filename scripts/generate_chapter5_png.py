# -*- coding: utf-8 -*-
"""
Script to generate high-resolution (300 DPI) scientific figures for Chapter 5 (Figures 5.1 to 5.5).
Outputs to:
  - diagrams/chapter5/hinh_5_x_*.png
  - output/hinh_5_x_*.png
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set standard academic typography and style
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'DejaVu Sans', 'Calibri', 'Arial', 'Tahoma']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.autolayout'] = False

OUT_DIRS = ['diagrams/chapter5', 'output']
for d in OUT_DIRS:
    os.makedirs(d, exist_ok=True)

def save_fig(fig, base_name):
    for d in OUT_DIRS:
        path = os.path.join(d, f"{base_name}.png")
        fig.savefig(path, dpi=300, bbox_inches='tight')
        print(f"[✓] Saved figure: {path}")
    plt.close(fig)

# ==============================================================================
# HÌNH 5.1: KIẾN TRÚC MÔI TRƯỜNG THỰC NGHIỆM VÀ LUỒNG THU THẬP SỐ LIỆU TỰ ĐỘNG
# ==============================================================================
def draw_hinh_5_1():
    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    # Background Host EC2
    host_box = patches.FancyBboxPatch((0.4, 0.4), 14.2, 7.7, boxstyle="round,pad=0.2",
                                      facecolor='#F8FAFC', edgecolor='#1E3A8A', linewidth=2.5)
    ax.add_patch(host_box)
    ax.text(7.5, 7.8, "HẠ TẦNG MÁY CHỦ AWS EC2: m7i-flex.large (2 vCPU, 8 GiB RAM, Ubuntu 24.04 LTS)",
            ha='center', va='center', fontsize=13, fontweight='bold', color='#1E3A8A')

    # Container 1: k6 Workload Generator (Left)
    k6_box = patches.FancyBboxPatch((0.8, 0.8), 4.0, 6.6, boxstyle="round,pad=0.15",
                                    facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=2)
    ax.add_patch(k6_box)
    ax.text(2.8, 7.1, "BỘ SINH TẢI k6 v0.50 (80 VUs)", ha='center', va='center', fontsize=11.5, fontweight='bold', color='#1D4ED8')
    ax.text(2.8, 6.75, "Chu kỳ: 30s Warmup → 60s Đo → 25s Cooldown", ha='center', va='center', fontsize=9, fontstyle='italic', color='#475569')

    # 5 Tenants in k6
    tenants = [
        ("t-acme (Nhỏ, 15 VUs)", "1 Bảng | 200 Thẻ | Luật: WIP STRICT (limit=2)", "#DBEAFE", "#1D4ED8", 5.9),
        ("pool-demo (Vừa, 15 VUs)", "4 Bảng | 500 Thẻ | Luật: WIP WARN (cảnh báo)", "#E0E7FF", "#4338CA", 4.8),
        ("t-lotus (Lớn, 20 VUs)", "10 Bảng | 1.000 Thẻ | Trường JSONB | WARN", "#EDE9FE", "#6D28D9", 3.7),
        ("t-finance (Chuẩn, 10 VUs)", "2 Bảng | 300 Thẻ | Luật: WIP STRICT (chặn)", "#DCFCE7", "#15803D", 2.6),
        ("t-aggressor (Gây nhiễu, 20 VUs)", "Bão tải đột biến 1.800–3.000 req/min dồn dập", "#FFE4E6", "#BE123C", 1.5),
    ]
    for name, desc, fc, ec, y in tenants:
        tbox = patches.FancyBboxPatch((1.0, y - 0.4), 3.6, 0.85, boxstyle="round,pad=0.08",
                                      facecolor=fc, edgecolor=ec, linewidth=1.5)
        ax.add_patch(tbox)
        ax.text(1.2, y + 0.12, name, fontsize=9.5, fontweight='bold', color=ec)
        ax.text(1.2, y - 0.18, desc, fontsize=8.2, color='#334155')

    # Container 2: Docker Compose Cluster (Center)
    doc_box = patches.FancyBboxPatch((5.3, 0.8), 5.2, 6.6, boxstyle="round,pad=0.15",
                                     facecolor='#F0FDFA', edgecolor='#0D9488', linewidth=2)
    ax.add_patch(doc_box)
    ax.text(7.9, 7.1, "CỤM DOCKER COMPOSE ĐA THUÊ BAO", ha='center', va='center', fontsize=11.5, fontweight='bold', color='#0F766E')
    ax.text(7.9, 6.75, "Kiểm soát tài nguyên ghim cứng qua cgroups", ha='center', va='center', fontsize=9, fontstyle='italic', color='#475569')

    # Components inside Docker
    # Caddy
    caddy_box = patches.FancyBboxPatch((5.6, 5.6), 4.6, 0.95, boxstyle="round,pad=0.08",
                                       facecolor='#CCFBF1', edgecolor='#0F766E', linewidth=1.5)
    ax.add_patch(caddy_box)
    ax.text(5.8, 6.18, "Cổng biên: Caddy Reverse Proxy / kanban-web", fontsize=9.5, fontweight='bold', color='#0F766E')
    ax.text(5.8, 5.82, "Hạn mức: 0.25 vCPU, 256 MB RAM | Định tuyến TLS & Static React", fontsize=8.2, color='#334155')

    # API
    api_box = patches.FancyBboxPatch((5.6, 3.85), 4.6, 1.55, boxstyle="round,pad=0.08",
                                     facecolor='#FEF3C7', edgecolor='#D97706', linewidth=2)
    ax.add_patch(api_box)
    ax.text(5.8, 5.12, "Dịch vụ Lõi: kanban-api (Spring Boot 3 + Java 21)", fontsize=10, fontweight='bold', color='#B45309')
    ax.text(5.8, 4.75, "• cgroups: 1.25 vCPU (Đỉnh 127.9%), RAM 2.560 MB (Đo 1.016 MB)", fontsize=8.3, color='#1E293B')
    ax.text(5.8, 4.42, "• Middleware: TenantContextFilter (JWT + MDC) & RateLimitFilter", fontsize=8.3, color='#1E293B')
    ax.text(5.8, 4.10, "• L1 Caffeine W-TinyLFU: Nạp cấu hình 0.12 ms (nhanh gấp 150x CSDL)", fontsize=8.3, color='#047857')

    # Redis
    redis_box = patches.FancyBboxPatch((5.6, 2.5), 4.6, 1.15, boxstyle="round,pad=0.08",
                                       facecolor='#FEE2E2', edgecolor='#B91C1C', linewidth=1.5)
    ax.add_patch(redis_box)
    ax.text(5.8, 3.38, "Bộ đệm & Phân phối: redis-cache (Redis 7)", fontsize=9.5, fontweight='bold', color='#B91C1C')
    ax.text(5.8, 3.02, "• 0.25 vCPU, 512 MB RAM | Thuật toán Token Bucket (1.200 req/min)", fontsize=8.2, color='#1E293B')
    ax.text(5.8, 2.70, "• L2 Cache phân vùng | Pub/Sub hủy đệm: tenant:config:invalidate", fontsize=8.2, color='#1E293B')

    # Postgres
    pg_box = patches.FancyBboxPatch((5.6, 1.0), 4.6, 1.3, boxstyle="round,pad=0.08",
                                    facecolor='#E0F2FE', edgecolor='#0369A1', linewidth=2)
    ax.add_patch(pg_box)
    ax.text(5.8, 2.05, "Cơ sở dữ liệu: postgres-db (PostgreSQL 16)", fontsize=9.5, fontweight='bold', color='#0369A1')
    ax.text(5.8, 1.70, "• 0.50 vCPU, 1.536 MB RAM | Lược đồ dùng chung (Shared Table)", fontsize=8.2, color='#1E293B')
    ax.text(5.8, 1.40, "• Tài khoản NOBYPASSRLS + FORCE ROW LEVEL SECURITY Fail-Closed", fontsize=8.2, color='#1E293B')
    ax.text(5.8, 1.15, "• Tiêm biến phiên nguyên tử: SET LOCAL app.tenant_id = :id", fontsize=8.2, color='#0369A1')

    # Container 3: Telemetry & Monitoring Pipeline (Right)
    tel_box = patches.FancyBboxPatch((11.0, 0.8), 3.3, 6.6, boxstyle="round,pad=0.15",
                                     facecolor='#FAF5FF', edgecolor='#7E22CE', linewidth=2)
    ax.add_patch(tel_box)
    ax.text(12.65, 7.1, "HỆ THỐNG THU THẬP TỰ ĐỘNG", ha='center', va='center', fontsize=11.5, fontweight='bold', color='#6B21A8')
    ax.text(12.65, 6.75, "Thu thập số liệu Telemetry & k6 Report", ha='center', va='center', fontsize=9, fontstyle='italic', color='#475569')

    # Sub-boxes in Telemetry
    t_items = [
        ("cAdvisor & Telemetry Collector", "Lấy mẫu CPU/RAM mỗi 5s (N=17 mẫu)\nĐỉnh Host CPU: 94% (188%/200%)\nFile: telemetry.csv", 5.4, "#F3E8FF", "#6B21A8"),
        ("Prometheus Scrape Actuator", "Micrometer JVM, HikariCP (đo 4/25)\nCaffeine Hit Ratio: 76–81%\nChỉ số quan sát nhận thức thuê bao", 3.8, "#F3E8FF", "#6B21A8"),
        ("k6 Summary Reporter", "Đo p50, p95, p99 từng nhóm tenant\n20.423 requests (327.56 RPS tổng)\nFile: proposed_summary.json", 2.2, "#F3E8FF", "#6B21A8"),
    ]
    for title, desc, y, fc, ec in t_items:
        ibox = patches.FancyBboxPatch((11.2, y - 0.5), 2.9, 1.25, boxstyle="round,pad=0.08",
                                      facecolor=fc, edgecolor=ec, linewidth=1.2)
        ax.add_patch(ibox)
        ax.text(11.35, y + 0.48, title, fontsize=9.2, fontweight='bold', color=ec)
        lines = desc.split('\n')
        for i, l in enumerate(lines):
            ax.text(11.35, y + 0.15 - i * 0.26, l, fontsize=8.0, color='#334155')

    # Bottom Database / Storage Icon
    dstore = patches.FancyBboxPatch((11.5, 0.95), 2.3, 0.65, boxstyle="round,pad=0.05",
                                    facecolor='#E2E8F0', edgecolor='#475569', linewidth=1.5)
    ax.add_patch(dstore)
    ax.text(12.65, 1.28, "Kho Lưu trữ Kết quả Thực nghiệm", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#334155')

    # Arrows connecting Left -> Center -> Right
    ax.annotate("", xy=(5.55, 6.07), xytext=(4.85, 6.07),
                arrowprops=dict(arrowstyle="->", color="#2563EB", lw=2.5))
    ax.text(5.2, 6.25, "HTTP/REST", ha='center', fontsize=8.5, fontweight='bold', color='#2563EB')

    ax.annotate("", xy=(7.9, 5.45), xytext=(7.9, 5.6),
                arrowprops=dict(arrowstyle="->", color="#0D9488", lw=2))

    ax.annotate("", xy=(7.9, 3.85), xytext=(7.9, 3.65),
                arrowprops=dict(arrowstyle="<->", color="#B91C1C", lw=2))
    ax.text(8.7, 3.75, "Token Bucket / PubSub", fontsize=7.8, color='#B91C1C', fontweight='bold')

    ax.annotate("", xy=(7.9, 2.35), xytext=(7.9, 2.5),
                arrowprops=dict(arrowstyle="<->", color="#0369A1", lw=2))
    ax.text(8.7, 2.42, "SET LOCAL + RLS", fontsize=7.8, color='#0369A1', fontweight='bold')

    ax.annotate("", xy=(11.15, 4.45), xytext=(10.25, 4.45),
                arrowprops=dict(arrowstyle="->", color="#7E22CE", lw=2, linestyle="--"))
    ax.text(10.65, 4.65, "Telemetry", ha='center', fontsize=8.0, color='#7E22CE', fontweight='bold')

    save_fig(fig, "hinh_5_1_pipeline_thuc_nghiem")

# ==============================================================================
# HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ KB-1 ĐẾN KB-4
# ==============================================================================
def draw_hinh_5_2():
    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    # Header title
    ax.text(7.5, 8.15, "HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ CÁC KỊCH BẢN KIỂM ĐỊNH KB-1 ĐẾN KB-4",
            ha='center', va='center', fontsize=12.5, fontweight='bold', color='#1E3A8A')

    cols = [
        {
            "x": 0.5, "title": "KỊCH BẢN KB-1\nKiểm định Ranh giới Định danh",
            "k_nfr": "K1 / NFR-01: Toàn vẹn Định danh",
            "target": "Xác thực token JWT tại biên, thiết lập ngữ cảnh luồng ThreadLocal bất biến và ngăn rò rỉ khi luân chuyển tải.",
            "test": "• 500 req JWT thiếu/sai chữ ký\n• 200 req tiêu đề Host lệch tenant\n• 1.500 req luân chuyển trên hồ luồng Tomcat (60 threads)",
            "mech": "TenantContextFilter + JWT Parser\n+ Khối lệnh try ... finally bắt buộc giải phóng ThreadLocal.",
            "res": "[OK] 100% chặn HTTP 401 (500/500)\n[OK] 100% chặn HTTP 403 (200/200)\n[OK] 100% khớp X-Tenant-ID & MDC\n[OK] 0% rò rỉ ngữ cảnh luồng.",
            "hdr_c": "#1E40AF", "bg_c": "#EFF6FF", "box_c": "#DBEAFE"
        },
        {
            "x": 4.1, "title": "KỊCH BẢN KB-2\nRào chắn CSDL Fail-Closed & RLS",
            "k_nfr": "K2 / NFR-02, NFR-03: Cô lập CSDL & RLS",
            "target": "Bảo đảm an toàn dữ liệu tuyệt đối ở tầng lưu trữ dùng chung, kích hoạt Fail-Closed và định lượng chi phí vi mô của RLS.",
            "test": "• 200 câu SELECT cố tình bỏ WHERE\n• 300 mẫu IDOR đoán UUID thẻ chéo\n• 100 truy vấn cố tình bỏ SET LOCAL\n• Microbenchmark 500 truy vấn RLS",
            "mech": "PostgreSQL FORCE ROW LEVEL SECURITY\n+ Tài khoản NOBYPASSRLS\n+ Biến phiên SET LOCAL app.tenant_id\n+ Chỉ mục B-Tree (tenant_id, ...).",
            "res": "[OK] 0 bản ghi rò rỉ (0 leak)\n[OK] 100% chặn IDOR (HTTP 404/403)\n[OK] Fail-Closed trả về rỗng (0 dòng)\n[OK] Độ trễ RLS vi mô: +0.45 ms (~36%).",
            "hdr_c": "#047857", "bg_c": "#ECFDF5", "box_c": "#D1FAE5"
        },
        {
            "x": 7.7, "title": "KỊCH BẢN KB-3\nKháng Láng giềng Ồn ào & Hiệu năng",
            "k_nfr": "K3 / NFR-04: Bảo toàn cam kết SLA",
            "target": "Dập tắt bão tải Aggressor tại biên, bảo toàn độ trễ p50/p95 cho các tenant bình thường và giải tỏa áp lực cho CSDL.",
            "test": "• Aggressor phát tải 1.800–3.000 req/phút dồn dập (20 VUs)\n• 4 tenant bình thường gửi tải hợp lệ (60 VUs)\n• Khảo sát bóc tách 4 cấu hình kiểm soát",
            "mech": "Redis Token Bucket (1.200 req/min)\n+ Bộ đệm 2 tầng: L1 Caffeine W-TinyLFU\n+ L2 Redis Tenant-partitioned\n+ Hồ kết nối HikariCP (max 25).",
            "res": "[OK] p50 giảm 88% (22.87–26.92 ms)\n[OK] p95 giảm 80% (242–276 ms < 500ms)\n[OK] Chặn 16.423 req 429 (92.66% bão tải)\n[OK] Thông lượng: 327.56 RPS (+223%).",
            "hdr_c": "#B45309", "bg_c": "#FFFBEB", "box_c": "#FEF3C7"
        },
        {
            "x": 11.3, "title": "KỊCH BẢN KB-4\nTùy biến Động 3 Lớp & Đồng bộ",
            "k_nfr": "K4 / NFR-05, NFR-06: Tùy biến & Nhất quán",
            "target": "Vận hành đồng thời các tổ chức có quy tắc nghiệp vụ đối lập trên 1 bộ mã nguồn, xác thực schema JSONB và đồng bộ hủy đệm.",
            "test": "• GET /tenant-settings/kanban (19 req)\n• POST task customData JSONB (19 req)\n• Di chuyển thẻ vi phạm WIP STRICT (limit=2, 19 req thử nghiệm)\n• Quản trị viên đổi luật và bắn Pub/Sub",
            "mech": "Động cơ siêu dữ liệu JSONB động\n+ Spring Data JPA validation\n+ Kênh Redis Pub/Sub tenant:config:invalidate\n+ Nạp Lazy Load L1 Caffeine.",
            "res": "[OK] 19/19 GET nạp config đạt 200 OK\n[OK] 19/19 POST JSONB đạt 201 Created\n[OK] 17/19 lượt vượt WIP bị chặn 422 (89.5%)\n[OK] Lan truyền hủy đệm Pub/Sub: 2.45 ms.",
            "hdr_c": "#7E22CE", "bg_c": "#FAF5FF", "box_c": "#F3E8FF"
        }
    ]

    for col in cols:
        cx = col["x"]
        # Column background
        cbox = patches.FancyBboxPatch((cx, 0.4), 3.2, 7.4, boxstyle="round,pad=0.1",
                                      facecolor=col["bg_c"], edgecolor=col["hdr_c"], linewidth=1.8)
        ax.add_patch(cbox)

        # Header
        hdr = patches.FancyBboxPatch((cx + 0.1, 7.05), 3.0, 0.65, boxstyle="round,pad=0.05",
                                     facecolor=col["hdr_c"], edgecolor=col["hdr_c"])
        ax.add_patch(hdr)
        ax.text(cx + 1.6, 7.38, col["title"], ha='center', va='center', fontsize=9.2, fontweight='bold', color='#FFFFFF')

        # Layer 1: K / NFR
        l1 = patches.FancyBboxPatch((cx + 0.15, 6.35), 2.9, 0.55, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor=col["hdr_c"], linewidth=1.2)
        ax.add_patch(l1)
        ax.text(cx + 1.6, 6.62, col["k_nfr"], ha='center', va='center', fontsize=8.5, fontweight='bold', color=col["hdr_c"])

        # Layer 2: Target
        l2 = patches.FancyBboxPatch((cx + 0.15, 5.15), 2.9, 1.05, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1)
        ax.add_patch(l2)
        ax.text(cx + 0.25, 6.02, "MỤC TIÊU CỐT LÕI:", fontsize=8.0, fontweight='bold', color='#334155')
        ax.text(cx + 0.25, 5.55, col["target"], fontsize=7.6, color='#475569', wrap=True)

        # Layer 3: Test Scenario
        l3 = patches.FancyBboxPatch((cx + 0.15, 3.85), 2.9, 1.15, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1)
        ax.add_patch(l3)
        ax.text(cx + 0.25, 4.82, "KỊCH BẢN KIỂM THỬ / TIÊM LỖI:", fontsize=8.0, fontweight='bold', color='#334155')
        ax.text(cx + 0.25, 4.30, col["test"], fontsize=7.5, color='#475569')

        # Layer 4: Mechanism
        l4 = patches.FancyBboxPatch((cx + 0.15, 2.55), 2.9, 1.15, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor='#CBD5E1', linewidth=1)
        ax.add_patch(l4)
        ax.text(cx + 0.25, 3.52, "CƠ CHẾ KIỂM SOÁT KỸ THUẬT:", fontsize=8.0, fontweight='bold', color='#334155')
        ax.text(cx + 0.25, 3.02, col["mech"], fontsize=7.5, color='#475569')

        # Layer 5: Result
        l5 = patches.FancyBboxPatch((cx + 0.15, 0.55), 2.9, 1.85, boxstyle="round,pad=0.05",
                                    facecolor=col["box_c"], edgecolor=col["hdr_c"], linewidth=1.5)
        ax.add_patch(l5)
        ax.text(cx + 0.25, 2.22, "KẾT QUẢ ĐẠT ĐƯỢC:", fontsize=8.2, fontweight='bold', color=col["hdr_c"])
        ax.text(cx + 0.25, 1.35, col["res"], fontsize=7.8, fontweight='bold', color='#0F172A')

    save_fig(fig, "hinh_5_2_ban_do_thiet_ke_kb1_kb4")

# ==============================================================================
# HÌNH 5.3: KẾT QUẢ KIỂM ĐỊNH ĐỊNH DANH, CÔ LẬP CSDL VÀ CHI PHÍ RLS (KB-1 & KB-2)
# ==============================================================================
def draw_hinh_5_3():
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15, 6.0), dpi=300)

    # Panel a: KB-1 Boundary Checks
    tests_a = ['Tomcat Pool (1.500 req)', 'Host Header lệch (200 req)', 'JWT lỗi / Không chữ ký (500 req)']
    passes_a = [1500, 200, 500]
    y_pos = np.arange(len(tests_a))

    bars1 = ax1.barh(y_pos, passes_a, color=['#10B981', '#3B82F6', '#6366F1'], height=0.55)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(tests_a, fontsize=9.2, fontweight='bold')
    ax1.set_xlabel('Số lượng mẫu kiểm định thành công (mẫu)', fontsize=9.5, fontweight='bold', color='#1E293B')
    ax1.set_title('(a) Ranh giới định danh & Ngữ cảnh luồng (KB-1)\n100% Chặn đúng mã HTTP 401/403, 0 rò rỉ MDC', fontsize=10.5, fontweight='bold', color='#1E3A8A', pad=12)
    ax1.set_xlim(0, 1750)
    for bar in bars1:
        w = bar.get_width()
        ax1.text(w + 30, bar.get_y() + bar.get_height()/2, f"{int(w)} / {int(w)} (100%)",
                 va='center', fontsize=9.0, fontweight='bold', color='#0F172A')
    ax1.grid(axis='x', linestyle='--', alpha=0.5)

    # Panel b: KB-2 Database Fail-Closed
    tests_b = ['Bỏ SET LOCAL (100 req)', 'IDOR đoán UUID (300 req)', 'SELECT bỏ WHERE (200 req)']
    leaks = [0, 0, 0]
    blocked = [100, 300, 200]
    y_pos2 = np.arange(len(tests_b))

    ax2.barh(y_pos2, blocked, color=['#F59E0B', '#0D9488', '#0284C7'], height=0.55, label='Bảo vệ an toàn (Chặn / Rỗng)')
    ax2.set_yticks(y_pos2)
    ax2.set_yticklabels(tests_b, fontsize=9.2, fontweight='bold')
    ax2.set_xlabel('Số ca tiêm lỗi được phòng thủ tuyệt đối', fontsize=9.5, fontweight='bold', color='#1E293B')
    ax2.set_title('(b) Rào chắn CSDL Fail-Closed (KB-2)\n0 bản ghi rò rỉ chéo trên toàn bộ các ca thử nghiệm', fontsize=10.5, fontweight='bold', color='#047857', pad=12)
    ax2.set_xlim(0, 380)
    for i, b in enumerate(blocked):
        ax2.text(b + 8, y_pos2[i], f"{b}/{b} (0 leak)", va='center', fontsize=9.0, fontweight='bold', color='#047857')
    ax2.grid(axis='x', linestyle='--', alpha=0.5)

    # Panel c: RLS Microbenchmark Latency
    configs = ['Tắt RLS\n(Lọc WHERE thủ công)', 'Bật đầy đủ RLS\n(SET LOCAL + FORCE RLS)']
    latencies = [1.25, 1.70]
    errors = [0.32, 0.41]
    x_pos = np.arange(len(configs))

    bars3 = ax3.bar(x_pos, latencies, yerr=errors, capsize=6, color=['#94A3B8', '#7C3AED'], width=0.45, edgecolor='#1E293B', linewidth=1.2)
    ax3.set_xticks(x_pos)
    ax3.set_xticklabels(configs, fontsize=9.2, fontweight='bold')
    ax3.set_ylabel('Độ trễ thực thi SQL trung bình (ms)', fontsize=9.5, fontweight='bold', color='#1E293B')
    ax3.set_title('(c) Phép đo vi mô chi phí RLS (N=500)\nPhụ trội vi mô: +0.45 ms (~36% microbenchmark)', fontsize=10.5, fontweight='bold', color='#6B21A8', pad=12)
    ax3.set_ylim(0, 2.5)

    for bar in bars3:
        h = bar.get_height()
        ax3.text(bar.get_x() + bar.get_width()/2, h + 0.12, f"{h:.2f} ms",
                 ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#0F172A')

    # Delta annotation arrow
    ax3.annotate("Δ = +0.45 ms\n(An toàn vi mô)", xy=(1, 1.75), xytext=(0.4, 2.1),
                 arrowprops=dict(arrowstyle="->", color="#B91C1C", lw=1.8),
                 fontsize=8.8, fontweight='bold', color="#B91C1C")
    ax3.grid(axis='y', linestyle='--', alpha=0.5)

    plt.tight_layout()
    save_fig(fig, "hinh_5_3_kiem_dinh_dinh_danh_csdl_rls")

# ==============================================================================
# HÌNH 5.4: ĐỘ TRỄ PHÂN TẦNG VÀ ĐIỀU TIẾT LƯU LƯỢNG AGGRESSOR (KB-3)
# ==============================================================================
def draw_hinh_5_4():
    fig = plt.figure(figsize=(15, 6.2), dpi=300)
    gs = fig.add_gridspec(1, 3, width_ratios=[1.1, 1.1, 0.9])

    ax1 = fig.add_subplot(gs[0])
    ax2 = fig.add_subplot(gs[1])
    ax3 = fig.add_subplot(gs[2])

    tenants = ['Acme (Nhỏ)', 'CTU (Vừa)', 'Lotus (Lớn)', 'Finance (Chuẩn)', 'Aggressor']
    p50_base = [233.33, 187.99, 189.25, 211.34, 156.54]
    p50_prop = [26.92, 23.98, 22.87, 25.43, 6.56]

    p95_base = [1526.48, 1166.02, 1257.16, 1291.25, 556.55]
    p95_prop = [253.67, 253.88, 242.17, 276.84, 43.39]

    y_pos = np.arange(len(tenants))
    bar_height = 0.35

    # Panel a: p50 Latency
    b1 = ax1.barh(y_pos + bar_height/2, p50_base, bar_height, label='Baseline (Tắt bảo vệ)', color='#64748B')
    b2 = ax1.barh(y_pos - bar_height/2, p50_prop, bar_height, label='Proposed (Đề xuất)', color='#0D9488')
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(tenants, fontsize=9.2, fontweight='bold')
    ax1.set_xlabel('Độ trễ trung vị p50 (ms)', fontsize=9.5, fontweight='bold')
    ax1.set_title('(a) Đối chiếu Độ trễ Trung vị p50\nGiảm ~88% cho toàn bộ 4 bên thuê bao', fontsize=10.5, fontweight='bold', color='#0F766E')
    ax1.set_xlim(0, 270)
    ax1.legend(loc='lower right', fontsize=8.5)
    ax1.grid(axis='x', linestyle='--', alpha=0.5)

    for i in range(len(tenants)):
        ax1.text(p50_prop[i] + 4, y_pos[i] - bar_height/2, f"{p50_prop[i]:.1f} ms", va='center', fontsize=8.2, fontweight='bold', color='#0F766E')

    # Panel b: p95 Latency & SLA
    b3 = ax2.barh(y_pos + bar_height/2, p95_base, bar_height, label='Baseline', color='#E11D48')
    b4 = ax2.barh(y_pos - bar_height/2, p95_prop, bar_height, label='Proposed', color='#10B981')
    ax2.axvline(500, color='#B91C1C', linestyle='--', linewidth=1.8, label='Ngưỡng SLA (500 ms)')
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(tenants, fontsize=9.2, fontweight='bold')
    ax2.set_xlabel('Độ trễ đuôi p95 (ms)', fontsize=9.5, fontweight='bold')
    ax2.set_title('(b) Độ trễ Đuôi p95 & Ngưỡng SLA\nBảo toàn SLA < 500 ms (0 lỗi SLA / 2.613 req)', fontsize=10.5, fontweight='bold', color='#15803D')
    ax2.set_xlim(0, 1750)
    ax2.legend(loc='lower right', fontsize=8.5)
    ax2.grid(axis='x', linestyle='--', alpha=0.5)

    for i in range(len(tenants)):
        ax2.text(p95_prop[i] + 25, y_pos[i] - bar_height/2, f"{p95_prop[i]:.1f} ms", va='center', fontsize=8.2, fontweight='bold', color='#047857')

    # Panel c: Aggressor Traffic Shaping & Telemetry
    ax3.set_title('(c) Điều tiết Tải Aggressor & Telemetry\nChặn 92.66% bão tải & Đỉnh CPU 94%', fontsize=10.5, fontweight='bold', color='#B45309')
    
    # Nested bars: Telemetry CPU
    containers = ['API\n(1.25 vCPU)', 'Caddy\n(0.25 vCPU)', 'Postgres\n(0.50 vCPU)', 'k6 Tool\n(Sinh tải)']
    cpu_peaks = [127.9, 17.1, 17.2, 19.7]
    x_c = np.arange(len(containers))

    bars_cpu = ax3.bar(x_c, cpu_peaks, color=['#DC2626', '#0284C7', '#0D9488', '#7C3AED'], width=0.5)
    ax3.set_xticks(x_c)
    ax3.set_xticklabels(containers, fontsize=8.2, fontweight='bold')
    ax3.set_ylabel('CPU Peak sử dụng (%)', fontsize=9.0, fontweight='bold')
    ax3.set_ylim(0, 150)
    ax3.grid(axis='y', linestyle='--', alpha=0.5)

    for bar in bars_cpu:
        h = bar.get_height()
        ax3.text(bar.get_x() + bar.get_width()/2, h + 2, f"{h:.1f}%", ha='center', va='bottom', fontsize=8.2, fontweight='bold')

    ax3.text(1.5, 138, "Aggressor: Chặn 16.423 req (92.66%)\nHost CPU Đỉnh: 188%/200% (94%)",
             ha='center', va='top', fontsize=8.2, fontweight='bold',
             bbox=dict(boxstyle='round,pad=0.4', facecolor='#FEF3C7', edgecolor='#D97706'))

    plt.tight_layout()
    save_fig(fig, "hinh_5_4_do_tre_dieu_tiet_luu_luong")

# ==============================================================================
# HÌNH 5.5: VÒNG ĐỜI TÙY BIẾN ĐỘNG JSONB VÀ WIP STRICT (KB-4)
# ==============================================================================
def draw_hinh_5_5():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6.2), dpi=300)

    # Panel a: 6-Step Lifecycle Flowchart
    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 8.5)
    ax1.axis('off')
    ax1.set_title('(a) Chu trình Vòng đời Cấu hình Động 6 bước khép kín (KB-4)\nLan truyền Pub/Sub: 2.45 ms | Nạp L1 Caffeine: 0.12 ms',
                  fontsize=11, fontweight='bold', color='#6B21A8', pad=12)

    steps = [
        ("1. Quản trị viên đổi cấu hình", "Thao tác tại Mặt phẳng Điều khiển (Control Plane), đổi luật WIP hoặc thêm trường động", 7.6, "#EDE9FE"),
        ("2. Ghi nhận an toàn vào CSDL", "Commit giao dịch bất đồng bộ an toàn vào bảng tenant_settings trong PostgreSQL 16", 6.3, "#EDE9FE"),
        ("3. Vô hiệu hóa đệm L1 & Bắn Pub/Sub", "Xóa đệm cục bộ và phát sự kiện qua kênh Redis: tenant:config:invalidate", 5.0, "#EDE9FE"),
        ("4. Lan truyền xóa đệm toàn cụm API", "Mọi API instances nhận thông điệp và xóa đệm L1 tức thì: 2.45 ± 0.65 ms", 3.7, "#FEF08A"),
        ("5. Nạp Lazy Load vào đệm L1 Caffeine", "Yêu cầu kế tiếp nạp cấu hình mới chỉ mất 0.12 ms (nhanh gấp 150x đọc CSDL 18.5 ms)", 2.4, "#FEF08A"),
        ("6. Giao diện & Backend áp dụng tức thời", "Kiểm tra luật STRICT/WARN và hiển thị trường động JSONB không cần dừng hệ thống", 1.1, "#BBF7D0"),
    ]

    for title, desc, y, col in steps:
        sbox = patches.FancyBboxPatch((0.5, y - 0.45), 9.0, 0.9, boxstyle="round,pad=0.08",
                                      facecolor=col, edgecolor='#7C3AED', linewidth=1.5)
        ax1.add_patch(sbox)
        ax1.text(0.8, y + 0.12, title, fontsize=9.5, fontweight='bold', color='#4C1D95')
        ax1.text(0.8, y - 0.22, desc, fontsize=8.2, color='#1E293B')
        if y > 1.5:
            ax1.annotate("", xy=(5.0, y - 0.45), xytext=(5.0, y - 0.75),
                         arrowprops=dict(arrowstyle="->", color="#7C3AED", lw=1.8))

    # Panel b: Verification Metrics
    ax2.set_title('(b) Bằng chứng Thực nghiệm Kiểm chứng Tùy biến Động (KB-4)\nXác thực Schema JSONB 100% & Thực thi luật WIP Strict 89.5%',
                  fontsize=11, fontweight='bold', color='#0F766E', pad=12)

    categories = [
        'GET /tenant-settings/kanban\n(Nạp cấu hình L1: 0.12 ms)',
        'POST task customData JSONB\n(story_points, sprint hợp lệ)',
        'WIP STRICT Enforcement\n(t-acme, limit=2, 19 lần thử)'
    ]
    passes = [19, 19, 17]
    totals = [19, 19, 19]
    rates = ["19/19 (100% HTTP 200)", "19/19 (100% HTTP 201)", "17/19 Chặn HTTP 422 (89.5%)\n(2 lượt đầu duyệt đầy limit=2)"]

    y_p = np.arange(len(categories))
    bars = ax2.barh(y_p, passes, color=['#0284C7', '#0D9488', '#D97706'], height=0.45)
    ax2.set_yticks(y_p)
    ax2.set_yticklabels(categories, fontsize=9.2, fontweight='bold')
    ax2.set_xlabel('Số lượng kiểm định đạt chuẩn (mẫu)', fontsize=9.5, fontweight='bold')
    ax2.set_xlim(0, 24)
    ax2.grid(axis='x', linestyle='--', alpha=0.5)

    for i, bar in enumerate(bars):
        w = bar.get_width()
        ax2.text(w + 0.5, y_p[i], rates[i], va='center', fontsize=8.8, fontweight='bold', color='#0F172A')

    # Additional text summary box
    summary_txt = (
        "TỔNG KẾT KB-4:\n"
        "• L1 Cache Hit: Nạp cấu hình trong 0.12 ms vs Đọc DB vật lý: 18.5 ms.\n"
        "• Schema JSONB: Cho phép mở rộng trường động mà không cần ALTER TABLE.\n"
        "• WIP Strict: Chặn đứng vi phạm với HTTP 422, độ trễ xử lý 12.15 ms.\n"
        "• Vận hành đồng thời đa cấu hình trái ngược trên 1 bộ mã nguồn duy nhất."
    )
    ax2.text(10.5, 0.25, summary_txt, ha='center', va='center', fontsize=8.4,
             bbox=dict(boxstyle='round,pad=0.5', facecolor='#F0FDF4', edgecolor='#16A34A', linewidth=1.2))

    plt.tight_layout()
    save_fig(fig, "hinh_5_5_tuy_bien_dong_jsonb_wip")

def main():
    print("Generating high-resolution Chapter 5 figures (300 DPI)...")
    draw_hinh_5_1()
    draw_hinh_5_2()
    draw_hinh_5_3()
    draw_hinh_5_4()
    draw_hinh_5_5()
    print("All 5 figures generated successfully in both diagrams/chapter5 and output/ directories.")

if __name__ == "__main__":
    main()
