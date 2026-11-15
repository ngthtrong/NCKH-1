# -*- coding: utf-8 -*-
"""
Script to generate MINIMALIST, HIGH-RESOLUTION (300 DPI) scientific figures for Chapter 5 (Figures 5.1 to 5.5).
Design principles:
- Academic publication standard (Nature / ACM / IEEE style)
- Pastel color palette:
    Soft Blue:   #EAF1F7
    Soft Green:  #EDF4F0
    Soft Cream:  #F4EBDD
    Light Gray:  #F3F5F7
    Gray Border: #D8E0E7
    Result Teal: #DCECE7
    Dark Slate text: #2C3E50 / #334155 (NO white text on dark backgrounds)
- Thin borders, subtle rounded corners, reduced text (40-50% reduction)
- Focus on clean visual communication: charts, big numbers, minimalist cards
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

# Typography and styling
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'DejaVu Sans', 'Calibri', 'Arial', 'Tahoma']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.autolayout'] = False

OUT_DIRS = ['diagrams/chapter5', 'output']
for d in OUT_DIRS:
    os.makedirs(d, exist_ok=True)

def save_fig(fig, base_name):
    for d in OUT_DIRS:
        path = os.path.join(d, f"{base_name}.png")
        fig.savefig(path, dpi=300, bbox_inches='tight', facecolor='#FFFFFF')
        print(f"[✓] Saved minimalist figure: {path}")
    plt.close(fig)

# ==============================================================================
# HÌNH 5.1: MÔI TRƯỜNG THỰC NGHIỆM VÀ PIPELINE (TỐI GIẢN, SÁNG, GỌN)
# ==============================================================================
def draw_hinh_5_1():
    fig, ax = plt.subplots(figsize=(13.5, 7.5), dpi=300)
    ax.set_xlim(0, 13.5)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    # Top Header Banner
    top_box = patches.FancyBboxPatch((0.5, 6.4), 12.5, 0.75, boxstyle="round,pad=0.08",
                                     facecolor='#EAF1F7', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(top_box)
    ax.text(6.75, 6.9, "MÔI TRƯỜNG THỰC NGHIỆM AWS EC2", ha='center', va='center',
            fontsize=12, fontweight='bold', color='#2C3E50')
    ax.text(6.75, 6.6, "m7i-flex.large · 2 vCPU · 8 GiB RAM · Ubuntu 24.04 LTS · Docker Compose", ha='center', va='center',
            fontsize=9.5, color='#475569')

    # Column 1: k6 Workload (Left)
    col1 = patches.FancyBboxPatch((0.5, 1.3), 3.6, 4.8, boxstyle="round,pad=0.1",
                                  facecolor='#F3F5F7', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(col1)
    ax.text(2.3, 5.75, "BỘ SINH TẢI\nk6 v0.50", ha='center', va='center', fontsize=11, fontweight='bold', color='#2C3E50')

    b_vus = patches.FancyBboxPatch((0.7, 4.8), 3.2, 0.55, boxstyle="round,pad=0.06",
                                   facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(b_vus)
    ax.text(2.3, 5.07, "Quy mô tải đồng thời: 80 VUs", ha='center', va='center', fontsize=9.5, fontweight='bold', color='#2C3E50')

    b_tenants = patches.FancyBboxPatch((0.7, 2.35), 3.2, 2.3, boxstyle="round,pad=0.06",
                                       facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(b_tenants)
    t_lines = [
        "5 Nhóm thuê bao mô phỏng:",
        "• t-acme: 15 VUs · 200 thẻ (WIP STRICT)",
        "• pool-demo: 15 VUs · 500 thẻ (WIP WARN)",
        "• t-lotus: 20 VUs · 1.000 thẻ (JSONB)",
        "• t-finance: 10 VUs · 300 thẻ (WIP STRICT)",
        "• t-aggressor: 20 VUs · Bão tải đột biến"
    ]
    ax.text(0.9, 4.35, t_lines[0], fontsize=9.0, fontweight='bold', color='#2C3E50')
    for i, line in enumerate(t_lines[1:]):
        ax.text(0.9, 4.0 - i * 0.35, line, fontsize=8.2, color='#334155')

    b_cycle = patches.FancyBboxPatch((0.7, 1.5), 3.2, 0.65, boxstyle="round,pad=0.06",
                                     facecolor='#EDF4F0', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(b_cycle)
    ax.text(2.3, 1.82, "Chu kỳ đo: 30s Warmup → 60s Đo → 25s Cooldown", ha='center', va='center',
            fontsize=8.0, color='#2C3E50')

    # Column 2: Application Cluster (Center)
    col2 = patches.FancyBboxPatch((4.5, 1.3), 4.5, 4.8, boxstyle="round,pad=0.1",
                                  facecolor='#F3F5F7', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(col2)
    ax.text(6.75, 5.75, "ỨNG DỤNG ĐA THUÊ BAO\nDocker Compose Cluster", ha='center', va='center',
            fontsize=11, fontweight='bold', color='#2C3E50')

    apps = [
        ("Web / Reverse Proxy (Caddy)", "Định tuyến yêu cầu · Phục vụ tĩnh React 18", 4.75, "#FFFFFF"),
        ("API Service (Spring Boot 3 + Java 21)", "Xác thực JWT · ThreadLocal · Đệm L1 · Metadata Engine", 3.85, "#EAF1F7"),
        ("Redis 7", "Bộ đệm L2 · Token Bucket (Rate Limit) · Pub/Sub", 2.95, "#FFFFFF"),
        ("PostgreSQL 16", "Shared-Schema · RLS Fail-Closed · SET LOCAL app.tenant_id", 2.05, "#EDF4F0"),
    ]
    for title, desc, y, bg in apps:
        abox = patches.FancyBboxPatch((4.75, y - 0.25), 4.0, 0.75, boxstyle="round,pad=0.06",
                                      facecolor=bg, edgecolor='#D8E0E7', linewidth=1)
        ax.add_patch(abox)
        ax.text(4.95, y + 0.22, title, fontsize=9.2, fontweight='bold', color='#2C3E50')
        ax.text(4.95, y - 0.08, desc, fontsize=8.0, color='#475569')

    ax.text(6.75, 1.5, "Cô lập tài nguyên theo cgroups cho từng container", ha='center', va='center',
            fontsize=8.0, fontstyle='italic', color='#64748B')

    # Column 3: Telemetry & Monitoring (Right)
    col3 = patches.FancyBboxPatch((9.4, 1.3), 3.6, 4.8, boxstyle="round,pad=0.1",
                                  facecolor='#F3F5F7', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(col3)
    ax.text(11.2, 5.75, "THU THẬP SỐ LIỆU\nPipeline Giám sát", ha='center', va='center',
            fontsize=11, fontweight='bold', color='#2C3E50')

    tels = [
        ("Prometheus", "Scrape Micrometer, HikariCP, JVM", 4.65, "#FFFFFF"),
        ("cAdvisor & Collector", "Lấy mẫu CPU, RAM container mỗi 5s → telemetry.csv", 3.65, "#FFFFFF"),
        ("k6 Summary", "Phân vị p50, p95, p99 → proposed_summary.json", 2.65, "#FFFFFF"),
        ("Kết quả Thực nghiệm", "Đối chiếu Baseline vs Proposed", 1.65, "#DCECE7"),
    ]
    for title, desc, y, bg in tels:
        tbox = patches.FancyBboxPatch((9.6, y - 0.3), 3.2, 0.8, boxstyle="round,pad=0.06",
                                      facecolor=bg, edgecolor='#D8E0E7', linewidth=1)
        ax.add_patch(tbox)
        ax.text(9.8, y + 0.2, title, fontsize=9.2, fontweight='bold', color='#2C3E50')
        ax.text(9.8, y - 0.12, desc, fontsize=8.0, color='#475569')

    # Connectors
    ax.annotate("", xy=(4.5, 4.0), xytext=(4.1, 4.0),
                arrowprops=dict(arrowstyle="->", color="#94A3B8", lw=1.5))
    ax.annotate("", xy=(9.4, 4.0), xytext=(9.0, 4.0),
                arrowprops=dict(arrowstyle="->", color="#94A3B8", lw=1.5))

    # Bottom Legend
    bot_box = patches.FancyBboxPatch((0.5, 0.5), 12.5, 0.55, boxstyle="round,pad=0.06",
                                     facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(bot_box)
    ax.text(6.75, 0.77, "Luồng request HTTP/REST (80 VUs)  -------->  Ứng dụng đa thuê bao  -------->  Luồng giám sát Telemetry & Kết quả",
            ha='center', va='center', fontsize=8.8, color='#475569')

    save_fig(fig, "hinh_5_1_pipeline_thuc_nghiem")

# ==============================================================================
# HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM KB-1 ĐẾN KB-4 (TỐI GIẢN, GỌN GÀNG)
# ==============================================================================
def draw_hinh_5_2():
    fig, ax = plt.subplots(figsize=(13.5, 7.5), dpi=300)
    ax.set_xlim(0, 13.5)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    ax.text(6.75, 7.0, "BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ CÁC KỊCH BẢN KIỂM ĐỊNH",
            ha='center', va='center', fontsize=12.5, fontweight='bold', color='#2C3E50')

    cards = [
        {
            "x": 0.5, "title": "KB-1 · Định danh",
            "p1_title": "Nội dung kiểm thử", "p1_desc": "JWT hỏng · Host lệch\nHồ luồng Tomcat",
            "p2_title": "Cơ chế chính", "p2_desc": "TenantContextFilter\nThreadLocal try/finally",
            "p3_title": "Kết quả quan sát", "p3_desc": "HTTP 401 / 403\nNhất quán MDC (0 rò rỉ)",
            "bg": "#EAF1F7"
        },
        {
            "x": 3.65, "title": "KB-2 · Cô lập dữ liệu",
            "p1_title": "Nội dung kiểm thử", "p1_desc": "SELECT bỏ WHERE · IDOR\nThiếu SET LOCAL",
            "p2_title": "Cơ chế chính", "p2_desc": "PostgreSQL FORCE RLS\nFail-Closed",
            "p3_title": "Kết quả quan sát", "p3_desc": "0 bản ghi rò rỉ\nPhụ trội RLS vi mô (+0.45 ms)",
            "bg": "#EDF4F0"
        },
        {
            "x": 6.8, "title": "KB-3 · Hiệu năng",
            "p1_title": "Nội dung kiểm thử", "p1_desc": "Aggressor bão tải (20 VUs)\nvs 4 Tenant thông thường",
            "p2_title": "Cơ chế chính", "p2_desc": "Redis Token Bucket\nĐệm 2 tầng (L1 + L2)",
            "p3_title": "Kết quả quan sát", "p3_desc": "Độ trễ p50, p95\nChặn 16.423 req HTTP 429",
            "bg": "#F4EBDD"
        },
        {
            "x": 9.95, "title": "KB-4 · Tùy biến",
            "p1_title": "Nội dung kiểm thử", "p1_desc": "Cấu hình tenant · Custom fields\nWIP STRICT (limit=2)",
            "p2_title": "Cơ chế chính", "p2_desc": "Metadata Engine JSONB\nRedis Pub/Sub",
            "p3_title": "Kết quả quan sát", "p3_desc": "19/19 JSONB (201 Created)\nThực thi WIP 422 (89.5%)",
            "bg": "#F3F5F7"
        }
    ]

    for c in cards:
        cx = c["x"]
        # Card container
        cbox = patches.FancyBboxPatch((cx, 1.4), 3.0, 5.1, boxstyle="round,pad=0.08",
                                      facecolor=c["bg"], edgecolor='#D8E0E7', linewidth=1)
        ax.add_patch(cbox)
        ax.text(cx + 1.5, 6.15, c["title"], ha='center', va='center',
                fontsize=11.5, fontweight='bold', color='#2C3E50')

        # Part 1: Content
        b1 = patches.FancyBboxPatch((cx + 0.2, 4.6), 2.6, 1.15, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax.add_patch(b1)
        ax.text(cx + 0.35, 5.48, c["p1_title"], fontsize=8.5, fontweight='bold', color='#64748B')
        ax.text(cx + 0.35, 5.0, c["p1_desc"], fontsize=8.2, color='#2C3E50')

        # Part 2: Mechanism
        b2 = patches.FancyBboxPatch((cx + 0.2, 3.1), 2.6, 1.15, boxstyle="round,pad=0.05",
                                    facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax.add_patch(b2)
        ax.text(cx + 0.35, 3.98, c["p2_title"], fontsize=8.5, fontweight='bold', color='#64748B')
        ax.text(cx + 0.35, 3.5, c["p2_desc"], fontsize=8.2, color='#2C3E50')

        # Part 3: Result
        b3 = patches.FancyBboxPatch((cx + 0.2, 1.6), 2.6, 1.15, boxstyle="round,pad=0.05",
                                    facecolor='#DCECE7', edgecolor='#D8E0E7', linewidth=0.8)
        ax.add_patch(b3)
        ax.text(cx + 0.35, 2.48, c["p3_title"], fontsize=8.5, fontweight='bold', color='#0F766E')
        ax.text(cx + 0.35, 2.0, c["p3_desc"], fontsize=8.2, fontweight='bold', color='#1E293B')

    # Bottom Mapping Row
    map_box = patches.FancyBboxPatch((0.5, 0.5), 12.5, 0.65, boxstyle="round,pad=0.06",
                                     facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=1)
    ax.add_patch(map_box)
    ax.text(6.75, 0.82, "Ánh xạ Yêu cầu Phi chức năng:   KB-1 --> NFR-01 (Định danh)   ·   KB-2 --> NFR-02, NFR-03 (Cô lập & Chi phí RLS)   ·   KB-3 --> NFR-04 (SLA < 500 ms)   ·   KB-4 --> NFR-05, NFR-06 (Tùy biến & Đệm)",
            ha='center', va='center', fontsize=8.2, fontweight='bold', color='#334155')

    save_fig(fig, "hinh_5_2_ban_do_thiet_ke_kb1_kb4")

# ==============================================================================
# HÌNH 5.3: KIỂM ĐỊNH ĐỊNH DANH VÀ CÔ LẬP DỮ LIỆU (BIG NUMBERS + BARS)
# ==============================================================================
def draw_hinh_5_3():
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13.5, 5.8), dpi=300)

    # Style all subplots
    for ax in (ax1, ax2, ax3):
        ax.set_facecolor('#FFFFFF')
        for spine in ax.spines.values():
            spine.set_color('#D8E0E7')
            spine.set_linewidth(1)

    # Panel a: Identity (Big Numbers)
    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 10)
    ax1.axis('off')
    
    p1 = patches.FancyBboxPatch((0.3, 0.3), 9.4, 9.4, boxstyle="round,pad=0.1",
                                facecolor='#EAF1F7', edgecolor='#D8E0E7', linewidth=1)
    ax1.add_patch(p1)
    ax1.text(5.0, 9.0, "(a) Định danh & Ngữ cảnh (KB-1)", ha='center', va='center',
            fontsize=11.5, fontweight='bold', color='#2C3E50')

    a_items = [
        ("500 / 500", "Yêu cầu JWT lỗi → HTTP 401\nChặn đứng tại cổng biên", 7.0),
        ("200 / 200", "Yêu cầu Host lệch → HTTP 403\nTừ chối truy cập sai định danh", 4.7),
        ("1.500", "Luân chuyển hồ luồng Tomcat\nKhớp 100% X-Tenant-ID & MDC", 2.4),
    ]
    for big, sub, y in a_items:
        ibox = patches.FancyBboxPatch((0.8, y - 0.75), 8.4, 1.5, boxstyle="round,pad=0.08",
                                      facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax1.add_patch(ibox)
        ax1.text(5.0, y + 0.32, big, ha='center', va='center', fontsize=18, fontweight='bold', color='#1E3A8A')
        ax1.text(5.0, y - 0.28, sub, ha='center', va='center', fontsize=8.5, color='#475569')

    ax1.text(5.0, 0.85, "Xác thực biên và giải phóng ThreadLocal triệt để", ha='center', va='center',
            fontsize=7.8, color='#64748B')

    # Panel b: Data Isolation (Big Numbers)
    ax2.set_xlim(0, 10)
    ax2.set_ylim(0, 10)
    ax2.axis('off')

    p2 = patches.FancyBboxPatch((0.3, 0.3), 9.4, 9.4, boxstyle="round,pad=0.1",
                                facecolor='#EDF4F0', edgecolor='#D8E0E7', linewidth=1)
    ax2.add_patch(p2)
    ax2.text(5.0, 9.0, "(b) Cô lập CSDL Fail-Closed (KB-2)", ha='center', va='center',
            fontsize=11.5, fontweight='bold', color='#2C3E50')

    b_items = [
        ("0", "SELECT bỏ WHERE bị rò rỉ (200 mẫu)\nFORCE RLS tự chèn bộ lọc", 7.0),
        ("300 / 300", "Mẫu thử IDOR UUID bị chặn\nTrả về HTTP 404 / 403", 4.7),
        ("0 dòng", "Khi thiếu SET LOCAL (100 mẫu)\nCơ chế Fail-Closed trả về rỗng", 2.4),
    ]
    for big, sub, y in b_items:
        ibox = patches.FancyBboxPatch((0.8, y - 0.75), 8.4, 1.5, boxstyle="round,pad=0.08",
                                      facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax2.add_patch(ibox)
        ax2.text(5.0, y + 0.32, big, ha='center', va='center', fontsize=18, fontweight='bold', color='#0D9488')
        ax2.text(5.0, y - 0.28, sub, ha='center', va='center', fontsize=8.5, color='#475569')

    ax2.text(5.0, 0.85, "PostgreSQL 16 bảo vệ an toàn ngay tại nhân CSDL", ha='center', va='center',
            fontsize=7.8, color='#64748B')

    # Panel c: RLS Microbenchmark (Horizontal Comparison Bars)
    ax3.set_title("(c) Chi phí Vi mô Thực thi RLS\nĐộ trễ truy vấn trung bình (N=500)", fontsize=11, fontweight='bold', color='#2C3E50', pad=12)
    categories = ['Không RLS\n(Lọc WHERE)', 'Có RLS\n(SET LOCAL + RLS)']
    values = [1.25, 1.70]
    colors = ['#E2E8F0', '#DCECE7']
    edge_c = ['#CBD5E1', '#0D9488']

    y_pos = np.arange(len(categories))
    bars = ax3.barh(y_pos, values, color=colors, edgecolor=edge_c, height=0.45, linewidth=1.2)
    ax3.set_yticks(y_pos)
    ax3.set_yticklabels(categories, fontsize=9.2, fontweight='bold', color='#334155')
    ax3.set_xlabel('Thời gian phản hồi (ms)', fontsize=9.0, color='#475569')
    ax3.set_xlim(0, 2.5)
    ax3.grid(axis='x', linestyle='--', alpha=0.4)

    for bar, val in zip(bars, values):
        w = bar.get_width()
        ax3.text(w + 0.08, bar.get_y() + bar.get_height()/2, f"{val:.2f} ms",
                 va='center', fontsize=9.5, fontweight='bold', color='#2C3E50')

    # Delta badge box inside panel c
    badge = patches.FancyBboxPatch((0.2, 0.15), 2.1, 0.55, boxstyle="round,pad=0.05",
                                   facecolor='#F4EBDD', edgecolor='#D8E0E7', linewidth=1)
    ax3.add_patch(badge)
    ax3.text(1.25, 0.42, "Phụ trội vi mô: +0,45 ms (~36%)\nTối ưu bởi chỉ mục B-Tree",
             ha='center', va='center', fontsize=8.0, fontweight='bold', color='#B45309')

    plt.tight_layout()
    save_fig(fig, "hinh_5_3_kiem_dinh_dinh_danh_csdl_rls")

# ==============================================================================
# HÌNH 5.4: ĐỘ TRỄ VÀ ĐIỀU TIẾT LƯU LƯỢNG (BIỂU ĐỒ THANH NGANG ĐỐI SÁNH)
# ==============================================================================
def draw_hinh_5_4():
    fig = plt.figure(figsize=(14.0, 6.0), dpi=300)
    gs = fig.add_gridspec(1, 3, width_ratios=[1.15, 1.15, 0.9])

    ax1 = fig.add_subplot(gs[0])
    ax2 = fig.add_subplot(gs[1])
    ax3 = fig.add_subplot(gs[2])

    for ax in (ax1, ax2):
        ax.set_facecolor('#FFFFFF')
        for spine in ax.spines.values():
            spine.set_color('#D8E0E7')
            spine.set_linewidth(1)

    tenants = ['Acme (Nhỏ)', 'Pool (Vừa)', 'Lotus (Lớn)', 'Finance (Chuẩn)']
    p50_base = [233.3, 188.0, 189.3, 211.3]
    p50_prop = [26.9, 24.0, 22.9, 25.4]

    p95_base = [1526.5, 1166.0, 1257.2, 1291.3]
    p95_prop = [253.7, 253.9, 242.2, 276.8]

    y_pos = np.arange(len(tenants))
    bar_height = 0.32

    # Panel a: p50 Latency (Grouped horizontal bars)
    ax1.barh(y_pos + bar_height/2, p50_base, bar_height, label='Baseline', color='#E2E8F0', edgecolor='#CBD5E1', linewidth=0.8)
    ax1.barh(y_pos - bar_height/2, p50_prop, bar_height, label='Proposed', color='#DCECE7', edgecolor='#0D9488', linewidth=1.0)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(tenants, fontsize=9.2, fontweight='bold', color='#334155')
    ax1.set_xlabel('Độ trễ trung vị p50 (ms)', fontsize=9.0, color='#475569')
    ax1.set_title('(a) Độ trễ p50\nSo sánh 4 tenant thông thường', fontsize=10.5, fontweight='bold', color='#2C3E50', pad=10)
    ax1.set_xlim(0, 270)
    ax1.grid(axis='x', linestyle='--', alpha=0.4)
    ax1.legend(loc='lower right', fontsize=8.0, framealpha=0.8)

    for i in range(len(tenants)):
        ax1.text(p50_prop[i] + 4, y_pos[i] - bar_height/2, f"{p50_prop[i]:.1f}", va='center', fontsize=8.2, fontweight='bold', color='#0F766E')

    # Panel b: p95 Latency & SLA Reference line
    ax2.barh(y_pos + bar_height/2, p95_base, bar_height, label='Baseline', color='#F4EBDD', edgecolor='#E2D3BE', linewidth=0.8)
    ax2.barh(y_pos - bar_height/2, p95_prop, bar_height, label='Proposed', color='#EDF4F0', edgecolor='#10B981', linewidth=1.0)
    ax2.axvline(500, color='#E11D48', linestyle='--', linewidth=1.2, label='SLA (500 ms)')
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(tenants, fontsize=9.2, fontweight='bold', color='#334155')
    ax2.set_xlabel('Độ trễ đuôi p95 (ms)', fontsize=9.0, color='#475569')
    ax2.set_title('(b) Độ trễ p95\nThang đo riêng · Ngưỡng tham chiếu 500 ms', fontsize=10.5, fontweight='bold', color='#2C3E50', pad=10)
    ax2.set_xlim(0, 1750)
    ax2.grid(axis='x', linestyle='--', alpha=0.4)
    ax2.legend(loc='lower right', fontsize=8.0, framealpha=0.8)

    for i in range(len(tenants)):
        ax2.text(p95_prop[i] + 25, y_pos[i] - bar_height/2, f"{p95_prop[i]:.1f}", va='center', fontsize=8.2, fontweight='bold', color='#047857')

    # Panel c: Aggressor Rate Limiting (Big Numbers Cards)
    ax3.set_xlim(0, 10)
    ax3.set_ylim(0, 10)
    ax3.axis('off')

    p3 = patches.FancyBboxPatch((0.2, 0.1), 9.6, 9.8, boxstyle="round,pad=0.1",
                                facecolor='#F3F5F7', edgecolor='#D8E0E7', linewidth=1)
    ax3.add_patch(p3)
    ax3.text(5.0, 9.3, "(c) Điều tiết Aggressor", ha='center', va='center',
            fontsize=11, fontweight='bold', color='#2C3E50')

    c_cards = [
        ("16.423", "Yêu cầu HTTP 429 bị chặn", 7.2, "#FFFFFF", "#B45309"),
        ("92,66%", "Tỷ lệ lưu lượng Aggressor bị cắt", 5.0, "#FFFFFF", "#B45309"),
        ("2.613 / 2.613", "Yêu cầu tenant thường thành công", 2.8, "#DCECE7", "#0F766E"),
    ]
    for big, sub, y, bg, col in c_cards:
        cbox = patches.FancyBboxPatch((0.8, y - 0.8), 8.4, 1.6, boxstyle="round,pad=0.06",
                                      facecolor=bg, edgecolor='#D8E0E7', linewidth=0.8)
        ax3.add_patch(cbox)
        ax3.text(5.0, y + 0.3, big, ha='center', va='center', fontsize=18, fontweight='bold', color=col)
        ax3.text(5.0, y - 0.3, sub, ha='center', va='center', fontsize=8.2, color='#475569')

    ax3.text(5.0, 1.0, "Độ trễ p99 nằm trong khoảng ~1.99–2.45s", ha='center', va='center',
            fontsize=7.8, color='#64748B')

    plt.tight_layout()
    save_fig(fig, "hinh_5_4_do_tre_dieu_tiet_luu_luong")

# ==============================================================================
# HÌNH 5.5: TÙY BIẾN ĐỘNG JSONB VÀ WIP (3 BƯỚC + KẾT QUẢ)
# ==============================================================================
def draw_hinh_5_5():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 6.0), dpi=300)

    # Panel a: 3-Step Process
    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 10)
    ax1.axis('off')

    p1 = patches.FancyBboxPatch((0.3, 0.3), 9.4, 9.4, boxstyle="round,pad=0.1",
                                facecolor='#EAF1F7', edgecolor='#D8E0E7', linewidth=1)
    ax1.add_patch(p1)
    ax1.text(5.0, 9.1, "Quy trình Kiểm chứng KB-4", ha='center', va='center',
            fontsize=12, fontweight='bold', color='#2C3E50')

    steps = [
        ("01", "Cấu hình tenant", "Thiết lập quy tắc WIP STRICT/WARN\nĐịnh nghĩa trường mở rộng (custom fields)", 7.1),
        ("02", "Kiểm tra API", "GET Settings truy xuất cấu hình\nPOST Custom Data theo đúng schema", 4.8),
        ("03", "Áp dụng WIP", "Kiểm tra giới hạn số thẻ trong cột\nChấp nhận (200) hoặc Từ chối (422)", 2.5),
    ]
    for num, stitle, sdesc, y in steps:
        sbox = patches.FancyBboxPatch((0.8, y - 0.8), 8.4, 1.6, boxstyle="round,pad=0.06",
                                      facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax1.add_patch(sbox)
        ax1.text(1.2, y + 0.28, f"{num}  ·  {stitle}", fontsize=11, fontweight='bold', color='#1E3A8A')
        ax1.text(1.2, y - 0.3, sdesc, fontsize=8.4, color='#475569')

    ax1.text(5.0, 0.9, "Kiểm chứng thay đổi cấu hình lúc chạy mà không sửa mã nguồn", ha='center', va='center',
            fontsize=8.0, color='#64748B')

    # Panel b: Verification Results (Big Numbers)
    ax2.set_xlim(0, 10)
    ax2.set_ylim(0, 10)
    ax2.axis('off')

    p2 = patches.FancyBboxPatch((0.3, 0.3), 9.4, 9.4, boxstyle="round,pad=0.1",
                                facecolor='#EDF4F0', edgecolor='#D8E0E7', linewidth=1)
    ax2.add_patch(p2)
    ax2.text(5.0, 9.1, "Kết quả Kiểm thử Thực nghiệm", ha='center', va='center',
            fontsize=12, fontweight='bold', color='#2C3E50')

    res_cards = [
        ("19 / 19", "GET Settings (HTTP 200)\nTruy xuất cấu hình Kanban thành công 100%", 7.1),
        ("19 / 19", "POST JSONB (HTTP 201)\nTạo thẻ kèm trường story_points, sprint hợp lệ", 4.8),
        ("2 + 17", "WIP STRICT (HTTP 200 / 422)\n2 chấp nhận (đầy limit=2) · 17 bị từ chối 422", 2.5),
    ]
    for big, sub, y in res_cards:
        rbox = patches.FancyBboxPatch((0.8, y - 0.8), 8.4, 1.6, boxstyle="round,pad=0.06",
                                      facecolor='#FFFFFF', edgecolor='#D8E0E7', linewidth=0.8)
        ax2.add_patch(rbox)
        ax2.text(5.0, y + 0.3, big, ha='center', va='center', fontsize=19, fontweight='bold', color='#0D9488')
        ax2.text(5.0, y - 0.3, sub, ha='center', va='center', fontsize=8.5, color='#334155')

    ax2.text(5.0, 0.9, "Xác nhận cơ chế kiểm tra siêu dữ liệu và thực thi quy tắc WIP đúng thiết kế", ha='center', va='center',
            fontsize=8.0, color='#64748B')

    plt.tight_layout()
    save_fig(fig, "hinh_5_5_tuy_bien_dong_jsonb_wip")

def main():
    print("Generating minimalist scientific figures (300 DPI) for Chapter 5...")
    draw_hinh_5_1()
    draw_hinh_5_2()
    draw_hinh_5_3()
    draw_hinh_5_4()
    draw_hinh_5_5()
    print("All 5 minimalist figures generated successfully in diagrams/chapter5 and output/ directories.")

if __name__ == "__main__":
    main()
