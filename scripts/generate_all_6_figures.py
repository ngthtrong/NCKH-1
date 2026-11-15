import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import textwrap

plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Segoe UI', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#CBD5E1'
plt.rcParams['axes.linewidth'] = 0.8

# ==============================================================================
# HÌNH 5.1: Môi trường và pipeline đo lường
# ==============================================================================
def draw_figure_5_1():
    fig, ax = plt.subplots(figsize=(14.5, 7.5), dpi=300)
    ax.set_xlim(0, 145)
    ax.set_ylim(0, 75)
    ax.axis('off')

    # Bọc ngoài: AWS EC2
    box_ec2 = patches.FancyBboxPatch((2, 2), 141, 71, boxstyle="round,pad=1,rounding_size=1.5",
                                    facecolor="#F8FAFC", edgecolor="#475569", linewidth=1.5, linestyle="--")
    ax.add_patch(box_ec2)
    ax.text(5, 70, "MÁY CHỦ THỰC NGHIỆM: AWS EC2 m7i-flex.large (2 vCPU, 8 GiB RAM, OS: Ubuntu 24.04 LTS)", 
            fontsize=11.5, fontweight='bold', color="#0F172A")

    # Cột 1: Bộ sinh tải k6 (x = 4.5 -> 37, w = 32.5)
    box_k6 = patches.FancyBboxPatch((4.5, 14), 32.5, 52, boxstyle="round,pad=0.8,rounding_size=1",
                                    facecolor="#EFF6FF", edgecolor="#2563EB", linewidth=1.4)
    ax.add_patch(box_k6)
    ax.text(20.75, 62.5, "Bộ sinh tải k6 (v0.50)", fontsize=11, fontweight='bold', color="#1E40AF", ha='center')
    ax.text(20.75, 59.2, "80 VUs đồng thời · 5 Nhóm Thuê bao", fontsize=8.0, fontweight='bold', color="#2563EB", ha='center')

    tenants_lines = [
        ("• t-acme (Nhỏ): 15 VUs (STRICT)", "#1E3A8A"),
        ("• pool-demo (Vừa): 15 VUs (WARN)", "#1E3A8A"),
        ("• t-lotus (Lớn): 20 VUs (JSONB)", "#1E3A8A"),
        ("• t-finance (Chuẩn): 10 VUs (STRICT)", "#1E3A8A"),
        ("• t-aggressor (Nhiễu): 20 VUs dồn dập", "#DC2626"),
        ("  (Tải đột biến ~1.800–3.000 req/phút)", "#B91C1C")
    ]
    for idx, (txt, clr) in enumerate(tenants_lines):
        ax.text(6.2, 54.0 - idx * 4.4, txt, fontsize=8.0, color=clr, fontweight='bold' if 'aggressor' in txt else 'normal')

    box_protocol = patches.FancyBboxPatch((6.5, 16.5), 28.5, 10.5, boxstyle="round,pad=0.5,rounding_size=0.5",
                                          facecolor="#DBEAFE", edgecolor="#3B82F6", linewidth=0.8)
    ax.add_patch(box_protocol)
    ax.text(20.75, 24.5, "Quy trình đo lường chuẩn hóa:", fontsize=8.2, fontweight='bold', color="#1E40AF", ha='center')
    ax.text(20.75, 21.5, "30s warmup → 60s đo chính thức (n=5)", fontsize=8, color="#1E3A8A", ha='center')
    ax.text(20.75, 18.5, "25s cooldown làm sạch đệm & kết nối", fontsize=8, color="#1E3A8A", ha='center')

    # Cột 2: Cụm Docker Compose (x = 42 -> 96, w = 54)
    box_compose = patches.FancyBboxPatch((42, 14), 54, 52, boxstyle="round,pad=0.8,rounding_size=1",
                                         facecolor="#F0FDF4", edgecolor="#16A34A", linewidth=1.4)
    ax.add_patch(box_compose)
    ax.text(69, 62.5, "Hạ tầng Docker Compose (Tài nguyên ghim cứng)", fontsize=11, fontweight='bold', color="#166534", ha='center')
    ax.text(69, 59.2, "Mạng cô lập nội bộ: nckh-ec2-net", fontsize=8.8, color="#15803D", ha='center')

    # kanban-web
    box_web = patches.FancyBboxPatch((45, 47), 48, 10, boxstyle="round,pad=0.5,rounding_size=0.6",
                                     facecolor="#FFFFFF", edgecolor="#0284C7", linewidth=1.2)
    ax.add_patch(box_web)
    ax.text(47, 53.8, "kanban-web (React 18 + Caddy Reverse Proxy)", fontsize=9.5, fontweight='bold', color="#0369A1")
    ax.text(47, 49.8, "Port 80/443 | Giới hạn cứng: 0.25 vCPU · 256 MB RAM", fontsize=8.5, color="#334155")

    # kanban-api
    box_api = patches.FancyBboxPatch((45, 31.5), 48, 12.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                     facecolor="#FEF3C7", edgecolor="#D97706", linewidth=1.2)
    ax.add_patch(box_api)
    ax.text(47, 40.5, "kanban-api (Spring Boot 3, Java 21, Tomcat)", fontsize=9.5, fontweight='bold', color="#92400E")
    ax.text(47, 37.2, "JwtTenantFilter, ThreadLocal MDC, L1 Caffeine, RateLimitFilter", fontsize=8.2, color="#475569")
    ax.text(47, 34.0, "Giới hạn: 1.25 vCPU · 2.560 MB RAM · Pool max 25", fontsize=8.2, fontweight='bold', color="#B45309")

    # redis & postgres
    box_redis = patches.FancyBboxPatch((45, 16.5), 22.5, 12.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                       facecolor="#FAF5FF", edgecolor="#9333EA", linewidth=1.2)
    ax.add_patch(box_redis)
    ax.text(46.5, 25.5, "redis-cache (Redis 7)", fontsize=9, fontweight='bold', color="#6B21A8")
    ax.text(46.5, 22.8, "Token Bucket 1.200/min", fontsize=8, color="#475569")
    ax.text(46.5, 20.3, "L2 Cache + Pub/Sub", fontsize=8, color="#475569")
    ax.text(46.5, 17.8, "0.25 vCPU · 512 MB RAM", fontsize=8, fontweight='bold', color="#7E22CE")

    box_pg = patches.FancyBboxPatch((70.5, 16.5), 22.5, 12.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                    facecolor="#F0FDF4", edgecolor="#15803D", linewidth=1.2)
    ax.add_patch(box_pg)
    ax.text(72, 25.5, "postgres-db (PG 16)", fontsize=9, fontweight='bold', color="#166534")
    ax.text(72, 22.8, "FORCE RLS · Pool schema", fontsize=8, color="#475569")
    ax.text(72, 20.3, "SET LOCAL current_tenant", fontsize=8, color="#475569")
    ax.text(72, 17.8, "0.50 vCPU · 1.536 MB RAM", fontsize=8, fontweight='bold', color="#15803D")

    # Cột 3: Giám sát & Bộ phân tích (x = 102 -> 139, w = 37)
    box_mon = patches.FancyBboxPatch((102, 14), 37, 52, boxstyle="round,pad=0.8,rounding_size=1",
                                     facecolor="#FFF7ED", edgecolor="#EA580C", linewidth=1.4)
    ax.add_patch(box_mon)
    ax.text(120.5, 62.5, "Giám sát & Pipeline Thu thập", fontsize=11, fontweight='bold', color="#C2410C", ha='center')
    ax.text(120.5, 59.2, "Bóc tách tự động & Kiểm chứng", fontsize=8.8, color="#EA580C", ha='center')

    box_prom = patches.FancyBboxPatch((105, 44), 31, 13.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                      facecolor="#FFFFFF", edgecolor="#FB923C", linewidth=1.1)
    ax.add_patch(box_prom)
    ax.text(107, 53.8, "Prometheus & Actuator", fontsize=9.5, fontweight='bold', color="#9A3412")
    ax.text(107, 50.5, "• hikaricp_connections_active", fontsize=8.2, color="#475569")
    ax.text(107, 48.0, "• http_req_duration, rate", fontsize=8.2, color="#475569")
    ax.text(107, 45.5, "• CPU / RAM cAdvisor metrics", fontsize=8.2, color="#475569")

    box_analyzer = patches.FancyBboxPatch((105, 28), 31, 13.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                          facecolor="#FFFFFF", edgecolor="#EA580C", linewidth=1.1)
    ax.add_patch(box_analyzer)
    ax.text(107, 37.8, "Bộ phân tích Tự động", fontsize=9.5, fontweight='bold', color="#9A3412")
    ax.text(107, 34.5, "• process-ec2-results.py", fontsize=8.2, color="#475569")
    ax.text(107, 31.8, "• Bóc tách p50, p95, p99 theo tenant", fontsize=8.2, color="#475569")
    ax.text(107, 29.2, "• Xuất summary JSON & bảng số liệu", fontsize=8.2, color="#475569")

    box_report = patches.FancyBboxPatch((105, 16.5), 31, 9.0, boxstyle="round,pad=0.5,rounding_size=0.6",
                                        facecolor="#FEF2F2", edgecolor="#DC2626", linewidth=1)
    ax.add_patch(box_report)
    ax.text(120.5, 22.5, "Báo cáo Thực nghiệm (Chương 5)", fontsize=9, fontweight='bold', color="#991B1B", ha='center')
    ax.text(120.5, 19.0, "Report_v2.docx (Bảng & Biểu đồ)", fontsize=8, color="#7F1D1D", ha='center')

    # Mũi tên kết nối
    ax.annotate("", xy=(44.5, 52), xytext=(37.5, 52),
                arrowprops=dict(arrowstyle="->", lw=2, color="#2563EB"))
    ax.text(41.0, 53.5, "HTTP/1.1", fontsize=7.5, fontweight='bold', color="#2563EB", ha='center')

    ax.annotate("", xy=(69, 44.5), xytext=(69, 46.5),
                arrowprops=dict(arrowstyle="->", lw=1.8, color="#0284C7"))

    ax.annotate("", xy=(56, 29.5), xytext=(56, 31.2),
                arrowprops=dict(arrowstyle="<->", lw=1.6, color="#7C3AED"))

    ax.annotate("", xy=(82, 29.5), xytext=(82, 31.2),
                arrowprops=dict(arrowstyle="<->", lw=1.6, color="#15803D"))

    ax.annotate("", xy=(104.5, 51), xytext=(93.5, 41),
                arrowprops=dict(arrowstyle="->", lw=1.6, color="#EA580C", linestyle=":"))
    ax.text(99, 48, "Scrape", fontsize=8, fontweight='bold', color="#EA580C", rotation=35)

    ax.annotate("", xy=(120.5, 41.8), xytext=(120.5, 43.8),
                arrowprops=dict(arrowstyle="->", lw=1.6, color="#EA580C"))

    # k6 summary JSON router
    ax.plot([37.0, 37.0, 99, 99, 104.5], [20, 8.5, 8.5, 34, 34], color="#2563EB", lw=1.5, linestyle="--")
    ax.annotate("", xy=(104.5, 34), xytext=(102, 34),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#2563EB"))
    ax.text(68, 6.0, "Truyền k6 summary raw JSON (baseline_summary.json / proposed_summary.json)", 
            fontsize=8.5, color="#1E40AF", ha='center', style='italic')

    ax.annotate("", xy=(120.5, 25.8), xytext=(120.5, 27.8),
                arrowprops=dict(arrowstyle="->", lw=1.6, color="#DC2626"))

    plt.savefig('output/hinh_5_1_pipeline_thuc_nghiem.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_1_pipeline_thuc_nghiem.png")

# ==============================================================================
# HÌNH 5.2: Bản đồ thiết kế thực nghiệm KB-1 đến KB-4
# ==============================================================================
def draw_figure_5_2():
    fig, ax = plt.subplots(figsize=(15.5, 12.5), dpi=300)
    ax.set_xlim(0, 155)
    ax.set_ylim(0, 125)
    ax.axis('off')

    # Main Header Box
    box_header = patches.FancyBboxPatch((15, 110), 125, 11, boxstyle="round,pad=0.6,rounding_size=1",
                                        facecolor="#1E293B", edgecolor="#0F172A", linewidth=1.5)
    ax.add_patch(box_header)
    ax.text(77.5, 116.8, "BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM ĐA CHIỀU (KỊCH BẢN KB-1 ĐẾN KB-4)", 
            fontsize=12.5, fontweight='bold', color="#FFFFFF", ha='center')
    ax.text(77.5, 112.5, "Kiểm chứng toàn diện 4 Khía cạnh Kỹ thuật K1–K4 & Đối ứng Yêu cầu Phi chức năng NFR-01 đến NFR-06", 
            fontsize=9.5, color="#94A3B8", ha='center')

    kbs = [
        {
            "id": "KB-1",
            "title": "Định danh & Ngữ cảnh",
            "sub": "K1 / NFR-01, NFR-06",
            "bg": "#EFF6FF", "border": "#3B82F6", "hdr_bg": "#2563EB",
            "goal": "Xác thực biên và chống rò rỉ ranh giới định danh đa thuê bao.",
            "inputs": [
                "• Gửi yêu cầu thiếu JWT hoặc chữ ký sai.",
                "• Gửi Host sai lệch với tenant claim.",
                "• 80 user đồng thời luân chuyển trên hồ luồng dùng chung Tomcat."
            ],
            "mechanisms": [
                "• JwtTenantFilter bóc tách claims.",
                "• ThreadLocal try-finally dọn dẹp sạch.",
                "• Đồng bộ nhãn nhật ký chẩn đoán MDC."
            ],
            "metrics": [
                "• Tỷ lệ từ chối sai lệch: 100% (HTTP 401)",
                "• Tỷ lệ rò rỉ ngữ cảnh: 0% tuyệt đối",
                "• Khớp MDC & X-Tenant-ID: 100%"
            ]
        },
        {
            "id": "KB-2",
            "title": "Cô lập Dữ liệu CSDL",
            "sub": "K2 / NFR-02, NFR-03",
            "bg": "#F0FDF4", "border": "#16A34A", "hdr_bg": "#15803D",
            "goal": "Phòng thủ chiều sâu tại nhân CSDL, kiểm soát bán kính sự cố.",
            "inputs": [
                "• Tiêm lỗi câu lệnh SELECT bỏ sót WHERE.",
                "• Gửi UUID thẻ của tenant khác (IDOR).",
                "• Thực thi truy vấn cố tình bỏ SET LOCAL.",
                "• Đo kiểm vi mô bật/tắt chính sách RLS."
            ],
            "mechanisms": [
                "• Cưỡng chế FORCE ROW LEVEL SECURITY.",
                "• Tài khoản DB: NOBYPASSRLS.",
                "• Gán biến phiên cục bộ SET LOCAL.",
                "• Phân vùng không gian tên cache."
            ],
            "metrics": [
                "• Số bản ghi rò rỉ chéo: 0 bản ghi",
                "• Cơ chế Fail-Closed: 100% (0 dòng)",
                "• Chi phí RLS vi mô: +0,45 ms (~36%)"
            ]
        },
        {
            "id": "KB-3",
            "title": "Hiệu năng & Kháng Nhiễu",
            "sub": "K3 / NFR-04",
            "bg": "#FFFBEB", "border": "#D97706", "hdr_bg": "#B45309",
            "goal": "Bảo toàn SLA và dập tắt bão lưu lượng của hàng xóm ồn ào.",
            "inputs": [
                "• 80 VUs tải dồn dập trên 5 nhóm tenant.",
                "• Aggressor xả tải đột biến 1.800–3.000 req/m.",
                "• Đo đạc 4 cấu hình kiểm soát tài nguyên."
            ],
            "mechanisms": [
                "• TenantRateLimitFilter tại cổng biên.",
                "• Token Bucket (1.200 req/phút, refill 20/s, burst 120) trên Redis.",
                "• Đệm 2 tầng L1 Caffeine + L2 Redis."
            ],
            "metrics": [
                "• p50: giảm từ ~200 ms xuống 60–64 ms",
                "• Thông lượng: tăng từ 20,29 lên 47,67 RPS",
                "• Chặn Aggressor: 11.190 req (HTTP 429)",
                "• Tỷ lệ trúng đệm L1: 76% – 97%"
            ]
        },
        {
            "id": "KB-4",
            "title": "Tùy biến & Đồng bộ Đệm",
            "sub": "K4 / NFR-05",
            "bg": "#FAF5FF", "border": "#9333EA", "hdr_bg": "#7E22CE",
            "goal": "Thực thi 3 lớp tùy biến không sửa mã nguồn, đồng bộ tức thời.",
            "inputs": [
                "• Đổi giao diện, nhận diện thương hiệu.",
                "• Kéo thẻ vượt WIP ở 2 tenant: STRICT vs WARN.",
                "• Tạo thẻ kèm trường mở rộng JSONB.",
                "• Admin đổi quy tắc WIP lúc đang chạy."
            ],
            "mechanisms": [
                "• Động cơ 3 lớp dựa trên siêu dữ liệu.",
                "• Lưu đệm L1 Caffeine tenant:{id}:config.",
                "• Kênh Redis Pub/Sub phát sự kiện hủy đệm.",
                "• Trường động JSONB kiểm tra lúc chạy."
            ],
            "metrics": [
                "• Nạp đệm L1: 0,12 ms (vs 18,5 ms DB)",
                "• Lan truyền Pub/Sub: 2,45 ± 0,65 ms",
                "• WIP: STRICT chặn 422, WARN kèm cảnh báo"
            ]
        }
    ]

    col_w = 34.5
    gap = 2.8
    start_x = 4.0

    for i, kb in enumerate(kbs):
        cx = start_x + i * (col_w + gap)
        
        # Outer Card
        card = patches.FancyBboxPatch((cx, 4), col_w, 100, boxstyle="round,pad=0.7,rounding_size=0.8",
                                      facecolor=kb["bg"], edgecolor=kb["border"], linewidth=1.3)
        ax.add_patch(card)

        # Header pill
        hdr = patches.FancyBboxPatch((cx + 1, 96.5), col_w - 2, 7.0, boxstyle="round,pad=0.4,rounding_size=0.5",
                                     facecolor=kb["hdr_bg"], edgecolor=kb["hdr_bg"])
        ax.add_patch(hdr)
        ax.text(cx + col_w/2, 101.2, f"{kb['id']} · {kb['title']}", fontsize=9.5, fontweight='bold', color="#FFFFFF", ha='center')
        ax.text(cx + col_w/2, 98.0, kb['sub'], fontsize=8.2, color="#E2E8F0", ha='center')

        # Arrow from header to card
        ax.annotate("", xy=(cx + col_w/2, 104.5), xytext=(77.5, 110),
                    arrowprops=dict(arrowstyle="->", lw=1.2, color="#475569"))

        # Section 1: Mục tiêu
        y_cur = 92.5
        ax.text(cx + 1.8, y_cur, "MỤC TIÊU CỐT LÕI:", fontsize=8.2, fontweight='bold', color="#0F172A")
        y_cur -= 3.0
        wrapped_goal = textwrap.fill(kb["goal"], width=34)
        ax.text(cx + 1.8, y_cur, wrapped_goal, fontsize=7.8, color="#334155", va='top')
        y_cur -= (wrapped_goal.count('\n') + 1) * 2.4 + 3.0

        # Section 2: Kịch bản thử nghiệm
        ax.text(cx + 1.8, y_cur, "KỊCH BẢN THỬ NGHIỆM / TIÊM LỖI:", fontsize=8.2, fontweight='bold', color="#0F172A")
        y_cur -= 3.0
        for inp in kb["inputs"]:
            wrapped_inp = textwrap.fill(inp, width=34)
            lines_cnt = wrapped_inp.count('\n') + 1
            ax.text(cx + 1.8, y_cur, wrapped_inp, fontsize=7.6, color="#334155", va='top')
            y_cur -= lines_cnt * 2.3 + 0.8
        y_cur -= 2.5

        # Section 3: Cơ chế can thiệp
        ax.text(cx + 1.8, y_cur, "CƠ CHẾ KIỂM SOÁT KỸ THUẬT:", fontsize=8.2, fontweight='bold', color="#0F172A")
        y_cur -= 3.0
        for mech in kb["mechanisms"]:
            wrapped_mech = textwrap.fill(mech, width=34)
            lines_cnt = wrapped_mech.count('\n') + 1
            ax.text(cx + 1.8, y_cur, wrapped_mech, fontsize=7.6, color="#334155", va='top')
            y_cur -= lines_cnt * 2.3 + 0.8

        # Section 4: Kết quả đạt được (hộp riêng biệt dưới chân card)
        p_res = patches.FancyBboxPatch((cx + 1, 5.5), col_w - 2, 25.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                      facecolor="#FFFFFF", edgecolor=kb["border"], linewidth=0.9)
        ax.add_patch(p_res)
        ax.text(cx + 2, 28.5, "KẾT QUẢ ĐẠT ĐƯỢC:", fontsize=8.2, fontweight='bold', color="#0F172A")
        y_res = 25.8
        for met in kb["metrics"]:
            wrapped_met = textwrap.fill(met, width=33)
            lines_cnt = wrapped_met.count('\n') + 1
            ax.text(cx + 2, y_res, wrapped_met, fontsize=7.5,
                    fontweight='bold' if any(k in met for k in ['100%', '0%', '60–64', '47,67']) else 'normal',
                    color="#047857" if any(k in met for k in ['0%', '100%']) else "#1E293B", va='top')
            y_res -= lines_cnt * 2.3 + 0.8

    plt.savefig('output/hinh_5_2_thiet_ke_kb1_kb4.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_2_thiet_ke_kb1_kb4.png")

# ==============================================================================
# HÌNH 5.3: Bằng chứng cô lập K1–K2 (3 vertical rows)
# ==============================================================================
def draw_figure_5_3():
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(13.0, 10.5), dpi=300)
    plt.subplots_adjust(top=0.95, bottom=0.08, hspace=0.38, left=0.28, right=0.96)

    # Panel 1: KB-1
    cases_k1 = [
        "Tomcat thread pool (1.500 req)",
        "Host vs JWT claim lệch (200 req)",
        "Thiếu JWT / Sai chữ ký (500 req)"
    ]
    y1 = np.arange(len(cases_k1))
    total_k1 = [1500, 200, 500]
    blocked_k1 = [1500, 200, 500]

    ax1.barh(y1, total_k1, height=0.45, color="#DBEAFE", edgecolor="#3B82F6", hatch="//", label="Tổng số mẫu kiểm thử")
    rects1 = ax1.barh(y1, blocked_k1, height=0.45, color="#2563EB", edgecolor="#1D4ED8", hatch="..", alpha=0.85, label="Bị chặn / Cô lập đúng (100%)")
    
    ax1.set_yticks(y1)
    ax1.set_yticklabels(cases_k1, fontsize=9.2, fontweight='500')
    ax1.set_xlabel("Số lượng mẫu kiểm định (mẫu)", fontsize=9.2, fontweight='bold', labelpad=4)
    ax1.set_title("(a) Mặt phẳng Định danh & Ranh giới Ngữ cảnh Luồng (KB-1)", fontsize=10.5, fontweight='bold', pad=6)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax1.set_xlim(0, 2150)

    for i, rect in enumerate(rects1):
        w = rect.get_width()
        tag = "Khớp 100% MDC (0% leak)" if i == 0 else "HTTP 403 (100% chặn)" if i == 1 else "HTTP 401 (100% chặn)"
        ax1.text(w + 35, rect.get_y() + rect.get_height()/2, f"{w} / {w} mẫu ({tag})", 
                 va='center', ha='left', fontsize=8.8, fontweight='bold', color="#1E40AF")
    ax1.legend(loc='center right', fontsize=8.5, framealpha=0.95)

    # Panel 2: KB-2
    cases_k2 = [
        "HikariCP thiếu SET LOCAL (100 mẫu)",
        "Đoán UUID thẻ của tenant khác (300 mẫu)",
        "SELECT bỏ sót WHERE tenant_id (200 mẫu)"
    ]
    y2 = np.arange(len(cases_k2))
    total_k2 = [100, 300, 200]
    defended_k2 = [100, 300, 200]

    ax2.barh(y2, total_k2, height=0.45, color="#DCFCE7", edgecolor="#16A34A", hatch="//", label="Tổng số kịch bản tiêm lỗi")
    rects2 = ax2.barh(y2, defended_k2, height=0.45, color="#15803D", edgecolor="#14532D", hatch="xx", alpha=0.85, label="Cơ chế Fail-Closed chặn (100%)")

    ax2.set_yticks(y2)
    ax2.set_yticklabels(cases_k2, fontsize=9.2, fontweight='500')
    ax2.set_xlabel("Số lượng mẫu tiêm lỗi (mẫu)", fontsize=9.2, fontweight='bold', labelpad=4)
    ax2.set_title("(b) Rào chắn CSDL PostgreSQL Fail-Closed & RLS (KB-2)", fontsize=10.5, fontweight='bold', pad=6)
    ax2.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax2.set_xlim(0, 680)

    for i, rect in enumerate(rects2):
        w = rect.get_width()
        tag = "Trả về 0 dòng an toàn (0 leak)" if i == 0 else "HTTP 404/403 (0 leak)" if i == 1 else "FORCE RLS chặn chéo (0 leak)"
        ax2.text(w + 10, rect.get_y() + rect.get_height()/2, f"{w} / {w} mẫu ({tag})", 
                 va='center', ha='left', fontsize=8.8, fontweight='bold', color="#166534")
    ax2.legend(loc='lower right', fontsize=8.5, framealpha=0.95)

    # Panel 3: Micro-benchmark RLS Overhead
    y3 = np.array([0, 1])
    rls_configs = [
        "Bật đầy đủ SET LOCAL + FORCE RLS hai lớp (KB-2.5)",
        "Tắt FORCE RLS, chỉ lọc thủ công WHERE ở tầng App (KB-2.4)"
    ]
    latencies = [1.70, 1.25]
    errors = [0.41, 0.32]

    bars = ax3.barh(y3, latencies, xerr=errors, height=0.45, capsize=5,
                    color=['#059669', '#64748B'], edgecolor=['#047857', '#334155'], hatch=['..', '//'])
    ax3.set_yticks(y3)
    ax3.set_yticklabels(rls_configs, fontsize=9.2, fontweight='500')
    ax3.invert_yaxis()
    ax3.set_xlabel("Thời gian thực thi truy vấn trung bình (ms) ± Độ lệch chuẩn", fontsize=9.2, fontweight='bold', labelpad=4)
    ax3.set_title("(c) Đo lường Vi mô Chi phí Độ trễ của Rào chắn CSDL (RLS Overhead Microbenchmark)", fontsize=10.5, fontweight='bold', pad=6)
    ax3.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax3.set_xlim(0, 2.85)

    ax3.text(1.25 + 0.38, 1, "1,25 ± 0,32 ms (Baseline chuẩn)", va='center', ha='left', fontsize=8.8, fontweight='bold', color="#334155")
    ax3.text(1.70 + 0.46, 0, "1,70 ± 0,41 ms (Tăng 0,45 ms ~ 36% trong microbenchmark)", va='center', ha='left', fontsize=8.8, fontweight='bold', color="#047857")

    fig.text(0.5, 0.02, "* Ghi chú: Mức tăng 0,45 ms là chi phí vi mô cục bộ đo trên tập 500 mẫu truy vấn microbenchmark; không đại diện cho chi phí chung cho mọi quy mô tải.",
             fontsize=8.5, style='italic', color="#475569", ha='center')

    plt.savefig('output/hinh_5_3_bang_chung_co_lap_k1_k2.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_3_bang_chung_co_lap_k1_k2.png")

# ==============================================================================
# HÌNH 5.4, 5.5, 5.6: Kept exact as verified
# ==============================================================================
def draw_figure_5_4():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.2), dpi=300, constrained_layout=True)

    categories = [
        'Gây nhiễu (Aggressor, 20 VUs)',
        'Chuẩn (Finance, 10 VUs)',
        'Lớn (Lotus, 20 VUs)',
        'Vừa (CTU Pool, 15 VUs)',
        'Nhỏ (Acme, 15 VUs)'
    ]
    y_pos = np.arange(len(categories))
    bar_height = 0.36

    p50_base = [156.54, 211.34, 189.25, 187.99, 233.33]
    p50_prop = [13.44, 63.99, 61.12, 60.55, 64.57]

    p95_base = [556.55, 1291.25, 1257.16, 1166.02, 1526.48]
    p95_prop = [124.54, 1138.35, 963.67, 934.57, 1135.73]

    rects1 = ax1.barh(y_pos - bar_height/2, p50_base, bar_height,
                      label='Baseline (Tắt Cache & Rate Limit)', color='#EF4444', edgecolor='#B91C1C', hatch='//', alpha=0.85)
    rects2 = ax1.barh(y_pos + bar_height/2, p50_prop, bar_height,
                      label='Đề xuất (Bật Cache 2 tầng & Rate Limit)', color='#10B981', edgecolor='#047857', hatch='..', alpha=0.9)

    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(categories, fontsize=9.5)
    ax1.invert_yaxis()
    ax1.set_xlabel('Độ trễ trung vị p50 (ms) - Càng thấp càng tốt', fontsize=9.5, fontweight='bold', labelpad=6)
    ax1.set_title('(a) Độ trễ trung vị p50 (Median Latency)', fontsize=11, fontweight='bold', pad=8)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax1.set_xlim(0, 310)

    for rect in rects1:
        w = rect.get_width()
        ax1.text(w + 3.5, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms",
                 va='center', ha='left', fontsize=8.8, color='#B91C1C', fontweight='bold')
    for rect in rects2:
        w = rect.get_width()
        ax1.text(w + 3.5, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms",
                 va='center', ha='left', fontsize=8.8, color='#047857', fontweight='bold')
    ax1.legend(loc='upper right', fontsize=8.5, framealpha=0.95)

    rects3 = ax2.barh(y_pos - bar_height/2, p95_base, bar_height,
                      label='Baseline (Độ trễ đuôi bị kéo dài do tranh chấp)', color='#F87171', edgecolor='#DC2626', hatch='//', alpha=0.85)
    rects4 = ax2.barh(y_pos + bar_height/2, p95_prop, bar_height,
                      label='Đề xuất (Bảo toàn cam kết SLA đuôi mượt mà)', color='#059669', edgecolor='#064E3B', hatch='..', alpha=0.9)

    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(categories, fontsize=9.5)
    ax2.invert_yaxis()
    ax2.set_xlabel('Độ trễ phân vị đuôi p95 (ms) - Càng thấp càng tốt', fontsize=9.5, fontweight='bold', labelpad=6)
    ax2.set_title('(b) Độ trễ phân vị đuôi p95 (Tail Latency)', fontsize=11, fontweight='bold', pad=8)
    ax2.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax2.set_xlim(0, 2050)

    for rect in rects3:
        w = rect.get_width()
        ax2.text(w + 25, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms",
                 va='center', ha='left', fontsize=8.8, color='#B91C1C', fontweight='bold')
    for rect in rects4:
        w = rect.get_width()
        ax2.text(w + 25, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms",
                 va='center', ha='left', fontsize=8.8, color='#065F46', fontweight='bold')
    ax2.legend(loc='upper right', fontsize=8.5, framealpha=0.95)

    plt.savefig('output/hinh_5_4_noisy_neighbor_latency.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_4_noisy_neighbor_latency.png")

def draw_figure_5_5():
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15.2, 4.8), dpi=300, constrained_layout=True)

    configs = [
        'Đầy đủ (Đề xuất)',
        'Chỉ Cache',
        'Chỉ Rate Limit',
        'Baseline'
    ]
    y_pos = np.arange(len(configs))
    bar_height = 0.52

    tps = [47.67, 35.80, 28.50, 20.29]
    colors1 = ['#059669', '#3B82F6', '#D97706', '#64748B']
    hatches = ['..', 'xx', '\\\\', '//']

    rects1 = ax1.barh(y_pos, tps, bar_height, color=colors1, edgecolor='#0F172A', hatch=hatches, alpha=0.9)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(configs, fontsize=9.5, fontweight='500')
    ax1.invert_yaxis()
    ax1.set_xlabel('Thông lượng giao dịch an toàn (RPS)', fontsize=9.5, fontweight='bold', labelpad=6)
    ax1.set_title('(a) Thông lượng xử lý (Throughput)', fontsize=10.5, fontweight='bold', pad=8)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax1.set_xlim(0, 60)

    for i, rect in enumerate(rects1):
        w = rect.get_width()
        tag = " (+135%)" if i == 0 else ""
        ax1.text(w + 1.2, rect.get_y() + rect.get_height()/2, f"{w:.2f} RPS{tag}",
                 va='center', ha='left', fontsize=8.8, fontweight='bold', color=colors1[i])

    active_conns = [4, 12, 18, 25]
    colors2 = ['#059669', '#3B82F6', '#D97706', '#EF4444']

    rects2 = ax2.barh(y_pos, active_conns, bar_height, color=colors2, edgecolor='#0F172A', hatch=hatches, alpha=0.9)
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels([])
    ax2.tick_params(left=False)
    ax2.invert_yaxis()
    ax2.set_xlabel('Số kết nối CSDL đỉnh điểm (/ 25 kết nối)', fontsize=9.5, fontweight='bold', labelpad=6)
    ax2.set_title('(b) Chiếm dụng HikariCP Connection', fontsize=10.5, fontweight='bold', pad=8)
    ax2.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax2.set_xlim(0, 36)

    for i, rect in enumerate(rects2):
        w = rect.get_width()
        tag = " (-84%)" if i == 0 else " (100% bão hòa)" if w == 25 else ""
        ax2.text(w + 0.6, rect.get_y() + rect.get_height()/2, f"{w} / 25{tag}",
                 va='center', ha='left', fontsize=8.8, fontweight='bold', color=colors2[i])

    blocked_reqs = [11190, 0, 11190, 0]
    colors3 = ['#059669', '#64748B', '#D97706', '#EF4444']

    rects3 = ax3.barh(y_pos, blocked_reqs, bar_height, color=colors3, edgecolor='#0F172A', hatch=hatches, alpha=0.9)
    ax3.set_yticks(y_pos)
    ax3.set_yticklabels([])
    ax3.tick_params(left=False)
    ax3.invert_yaxis()
    ax3.set_xlabel('Số yêu cầu Aggressor bị chặn (HTTP 429)', fontsize=9.5, fontweight='bold', labelpad=6)
    ax3.set_title('(c) Khống chế Hàng xóm Ồn ào (HTTP 429)', fontsize=10.5, fontweight='bold', pad=8)
    ax3.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax3.set_xlim(0, 16800)

    for i, rect in enumerate(rects3):
        w = rect.get_width()
        tag = "Chặn 11.190 req (0% lỗi SLA)" if i == 0 else "Chặn 11.190 req" if i == 2 else "0 req (Nghẽn CSDL, 63 fail)"
        ax3.text(w + 350, rect.get_y() + rect.get_height()/2, tag,
                 va='center', ha='left', fontsize=8.5, fontweight='bold', color=colors3[i])

    plt.savefig('output/hinh_5_5_doi_sanh_cau_hinh.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_5_doi_sanh_cau_hinh.png")

def draw_figure_5_6():
    fig, ax = plt.subplots(figsize=(14.5, 7.8), dpi=300)
    ax.set_xlim(0, 145)
    ax.set_ylim(0, 78)
    ax.axis('off')

    # Main Header
    box_header = patches.FancyBboxPatch((15, 66), 115, 9.5, boxstyle="round,pad=0.6,rounding_size=1",
                                        facecolor="#1E293B", edgecolor="#0F172A", linewidth=1.5)
    ax.add_patch(box_header)
    ax.text(72.5, 72.2, "VÒNG ĐỜI CẤU HÌNH ĐỘNG VÀ ĐỒNG BỘ ĐỆM ĐA TẦNG (KỊCH BẢN KB-4)", 
            fontsize=12, fontweight='bold', color="#FFFFFF", ha='center')
    ax.text(72.5, 68.2, "Quy trình khép kín: Thay đổi cấu hình → Giao dịch DB → Hủy đệm L1 → Pub/Sub lan truyền → Nạp lại đệm siêu tốc", 
            fontsize=9.2, color="#94A3B8", ha='center')

    steps = [
        {
            "step": "BƯỚC 1",
            "title": "Admin Thao tác Cấu hình",
            "box_color": "#EFF6FF", "border": "#3B82F6", "badge": "#2563EB",
            "desc": "Quản trị viên đổi chế độ WIP từ STRICT sang WARN, đổi bảng màu thương hiệu, hoặc khai báo thêm trường mở rộng JSONB.",
            "metric": "Thao tác trên Mặt phẳng Điều khiển"
        },
        {
            "step": "BƯỚC 2",
            "title": "Giao dịch DB Hoàn tất",
            "box_color": "#F0FDF4", "border": "#16A34A", "badge": "#15803D",
            "desc": "Cập nhật bản ghi tenants.settings trong CSDL PostgreSQL. Giao dịch commit thành công bảo đảm độ bền ACID.",
            "metric": "Commit CSDL an toàn"
        },
        {
            "step": "BƯỚC 3",
            "title": "Hủy Đệm L1 & Bắn Pub/Sub",
            "box_color": "#FFFBEB", "border": "#D97706", "badge": "#B45309",
            "desc": "Vô hiệu hóa ngay lập tức khóa tenant:{id}:config trên L1 Caffeine cục bộ. Phát thông điệp sự kiện lên Redis Pub/Sub.",
            "metric": "Kênh: tenant-events"
        },
        {
            "step": "BƯỚC 4",
            "title": "Lan truyền Cụm API",
            "box_color": "#FAF5FF", "border": "#9333EA", "badge": "#7E22CE",
            "desc": "Tất cả các thể hiện API (Clustered API Instances) nhận sự kiện qua Redis Pub/Sub và đồng loạt xóa khóa đệm L1 tương ứng.",
            "metric": "Đo đạc: 2,45 ± 0,65 ms"
        },
        {
            "step": "BƯỚC 5",
            "title": "Nạp Đệm L1 Mới (Lazy)",
            "box_color": "#F0FDF4", "border": "#059669", "badge": "#047857",
            "desc": "Yêu cầu kế tiếp của người dùng tới API gặp Cache Miss L1 → tự động đọc cấu hình mới từ DB và nạp vào bộ nhớ trong Caffeine.",
            "metric": "Đo đạc: 0,12 ms (vs 18,5 ms DB)"
        },
        {
            "step": "BƯỚC 6",
            "title": "Áp dụng Tức thời trên UI",
            "box_color": "#EFF6FF", "border": "#0284C7", "badge": "#0369A1",
            "desc": "Người dùng thao tác kéo thẻ vượt hạn mức WIP: Hệ thống chấp nhận giao dịch với HTTP 200 kèm cảnh báo vàng wipWarning thay vì chặn 422.",
            "metric": "Kiểm chứng thực tế: 100% khớp luật"
        }
    ]

    card_w = 42
    card_h = 24.5

    for i in range(3):
        s = steps[i]
        cx = 6 + i * 46
        cy = 38
        card = patches.FancyBboxPatch((cx, cy), card_w, card_h, boxstyle="round,pad=0.6,rounding_size=0.8",
                                      facecolor=s["box_color"], edgecolor=s["border"], linewidth=1.2)
        ax.add_patch(card)

        badge = patches.FancyBboxPatch((cx + 1.5, cy + card_h - 4.8), 12, 3.6, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor=s["badge"], edgecolor=s["badge"])
        ax.add_patch(badge)
        ax.text(cx + 7.5, cy + card_h - 3.0, s["step"], fontsize=8, fontweight='bold', color="#FFFFFF", ha='center')

        ax.text(cx + 15, cy + card_h - 3.0, s["title"], fontsize=9.2, fontweight='bold', color="#0F172A")
        
        wrapped_desc = textwrap.fill(s["desc"], width=38)
        ax.text(cx + 2, cy + card_h - 6.8, wrapped_desc, fontsize=8, color="#334155", va='top')

        m_box = patches.FancyBboxPatch((cx + 2, cy + 1.5), card_w - 4, 4.0, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor="#FFFFFF", edgecolor=s["border"], linewidth=0.8)
        ax.add_patch(m_box)
        ax.text(cx + card_w/2, cy + 3.5, s["metric"], fontsize=8.2, fontweight='bold', color=s["badge"], ha='center')

        if i < 2:
            ax.annotate("", xy=(cx + card_w + 3.2, cy + card_h/2), xytext=(cx + card_w + 0.8, cy + card_h/2),
                        arrowprops=dict(arrowstyle="->", lw=2, color="#475569"))

    ax.annotate("", xy=(121, 32), xytext=(121, 37.2),
                arrowprops=dict(arrowstyle="->", lw=2, color="#475569"))

    for i in range(3):
        step_idx = 3 + i
        s = steps[step_idx]
        cx = 98 - i * 46
        cy = 6
        card = patches.FancyBboxPatch((cx, cy), card_w, card_h, boxstyle="round,pad=0.6,rounding_size=0.8",
                                      facecolor=s["box_color"], edgecolor=s["border"], linewidth=1.2)
        ax.add_patch(card)

        badge = patches.FancyBboxPatch((cx + 1.5, cy + card_h - 4.8), 12, 3.6, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor=s["badge"], edgecolor=s["badge"])
        ax.add_patch(badge)
        ax.text(cx + 7.5, cy + card_h - 3.0, s["step"], fontsize=8, fontweight='bold', color="#FFFFFF", ha='center')

        ax.text(cx + 15, cy + card_h - 3.0, s["title"], fontsize=9.2, fontweight='bold', color="#0F172A")
        
        wrapped_desc = textwrap.fill(s["desc"], width=38)
        ax.text(cx + 2, cy + card_h - 6.8, wrapped_desc, fontsize=8, color="#334155", va='top')

        m_box = patches.FancyBboxPatch((cx + 2, cy + 1.5), card_w - 4, 4.0, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor="#FFFFFF", edgecolor=s["border"], linewidth=0.8)
        ax.add_patch(m_box)
        ax.text(cx + card_w/2, cy + 3.5, s["metric"], fontsize=8.2, fontweight='bold', color=s["badge"], ha='center')

        if i < 2:
            ax.annotate("", xy=(cx - 3.2, cy + card_h/2), xytext=(cx - 0.8, cy + card_h/2),
                        arrowprops=dict(arrowstyle="->", lw=2, color="#475569"))

    plt.savefig('output/hinh_5_6_vong_doi_cau_hinh_k4.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_6_vong_doi_cau_hinh_k4.png")

if __name__ == '__main__':
    draw_figure_5_1()
    draw_figure_5_2()
    draw_figure_5_3()
    draw_figure_5_4()
    draw_figure_5_5()
    draw_figure_5_6()
