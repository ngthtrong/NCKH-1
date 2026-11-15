import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import textwrap

# Set global academic styling
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Segoe UI', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#94A3B8'
plt.rcParams['axes.linewidth'] = 0.8
plt.rcParams['text.color'] = '#1E293B'
plt.rcParams['axes.labelcolor'] = '#1E293B'
plt.rcParams['xtick.color'] = '#475569'
plt.rcParams['ytick.color'] = '#475569'

# Shared Academic Palette
C_BASELINE = '#64748B'    # Slate grey
C_PROPOSED = '#0D9488'    # Teal
C_WARNING  = '#D97706'    # Amber / Orange
C_DANGER   = '#DC2626'    # Red
C_PUBSUB   = '#7C3AED'    # Violet (for Pub/Sub only)
C_BLUE     = '#2563EB'    # Subdued blue

# ==============================================================================
# HÌNH 5.1: Môi trường và pipeline đo lường (Tối giản, 3 tông màu, 15-16cm)
# ==============================================================================
def draw_figure_5_1():
    fig, ax = plt.subplots(figsize=(10.5, 5.4), dpi=300)
    ax.set_xlim(0, 105)
    ax.set_ylim(0, 54)
    ax.axis('off')

    # Bọc ngoài: AWS EC2 (Viền xám mảnh)
    box_ec2 = patches.FancyBboxPatch((1.5, 1.5), 102, 51, boxstyle="round,pad=0.8,rounding_size=1.0",
                                     facecolor="#FAFAFA", edgecolor="#94A3B8", linewidth=1.0, linestyle="--")
    ax.add_patch(box_ec2)
    ax.text(3.5, 50.2, "MÁY CHỦ THỰC NGHIỆM: AWS EC2 m7i-flex.large (2 vCPU, 8 GiB RAM, OS Ubuntu 24.04)", 
            fontsize=9.2, fontweight='bold', color="#334155")

    # Cột 1: Nguồn sinh tải k6 (x = 2.5 -> 27.5, w = 25.0)
    box_k6 = patches.FancyBboxPatch((2.5, 6), 25.0, 42, boxstyle="round,pad=0.6,rounding_size=0.8",
                                    facecolor="#F1F5F9", edgecolor="#64748B", linewidth=1.1)
    ax.add_patch(box_k6)
    ax.text(15.0, 45.2, "Sinh tải k6 (v0.50)", fontsize=10, fontweight='bold', color="#0F172A", ha='center')
    ax.text(15.0, 42.5, "80 VUs · 5 Nhóm Thuê bao", fontsize=8.0, color="#475569", ha='center')

    tenants = [
        "• t-acme (Nhỏ): 15 VUs, STRICT",
        "• pool-demo (Vừa): 15 VUs, WARN",
        "• t-lotus (Lớn): 20 VUs, JSONB",
        "• t-finance: 10 VUs (STRICT)",
        "• t-aggressor: 20 VUs dồn dập\n  (Bão tải 1.800–3.000 req/phút)"
    ]
    y_t = 38.5
    for t in tenants:
        clr = C_DANGER if "aggressor" in t else "#334155"
        fw = "bold" if "aggressor" in t else "normal"
        ax.text(3.8, y_t, t, fontsize=7.6, color=clr, fontweight=fw)
        y_t -= 3.6 if "\n" not in t else 4.6

    # Quy trình đo chuẩn
    box_proto = patches.FancyBboxPatch((3.8, 7.5), 22.4, 9.0, boxstyle="round,pad=0.4,rounding_size=0.5",
                                       facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=0.8)
    ax.add_patch(box_proto)
    ax.text(15.0, 14.0, "Quy trình đo chuẩn (n=5):", fontsize=7.8, fontweight='bold', color="#0F172A", ha='center')
    ax.text(15.0, 11.5, "30s warmup → 60s đo chính thức", fontsize=7.4, color="#475569", ha='center')
    ax.text(15.0, 9.2, "25s cooldown làm sạch đệm", fontsize=7.4, color="#475569", ha='center')

    # Cột 2: Cụm Docker Compose (x = 32.5 -> 74.5, w = 42.0)
    box_compose = patches.FancyBboxPatch((32.5, 6), 42.0, 42, boxstyle="round,pad=0.6,rounding_size=0.8",
                                         facecolor="#F0FDFA", edgecolor="#0D9488", linewidth=1.2)
    ax.add_patch(box_compose)
    ax.text(53.5, 45.2, "Hạ tầng Docker Compose (Tài nguyên ghim cứng)", fontsize=9.0, fontweight='bold', color="#0F766E", ha='center')
    ax.text(53.5, 42.5, "Mạng nội bộ: nckh-ec2-net", fontsize=7.8, color="#115E59", ha='center')

    # Container 1: Web
    box_web = patches.FancyBboxPatch((34.5, 33.5), 38.0, 7.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                     facecolor="#FFFFFF", edgecolor="#0D9488", linewidth=0.9)
    ax.add_patch(box_web)
    ax.text(53.5, 38.5, "kanban-web (React 18 + Caddy Reverse Proxy)", fontsize=8.6, fontweight='bold', color="#0F172A", ha='center')
    ax.text(53.5, 35.5, "Port 80/443 | 0.25 vCPU · 256 MB RAM", fontsize=7.6, color="#475569", ha='center')

    # Container 2: API
    box_api = patches.FancyBboxPatch((34.5, 20.0), 38.0, 11.0, boxstyle="round,pad=0.4,rounding_size=0.5",
                                     facecolor="#FFFFFF", edgecolor="#0D9488", linewidth=1.1)
    ax.add_patch(box_api)
    ax.text(53.5, 28.2, "kanban-api (Spring Boot 3, Java 21)", fontsize=9.0, fontweight='bold', color="#0F766E", ha='center')
    ax.text(53.5, 25.4, "TenantContextFilter · RateLimitFilter · L1 Caffeine", fontsize=7.6, color="#334155", ha='center')
    ax.text(53.5, 22.4, "1.25 vCPU · 2.560 MB RAM · HikariCP max 25", fontsize=7.6, fontweight='bold', color="#0F766E", ha='center')

    # Container 3 & 4: Redis & Postgres
    box_redis = patches.FancyBboxPatch((34.5, 7.5), 18.0, 10.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                       facecolor="#FFFFFF", edgecolor="#64748B", linewidth=0.9)
    ax.add_patch(box_redis)
    ax.text(43.5, 15.2, "redis-cache (Redis 7)", fontsize=8.2, fontweight='bold', color="#0F172A", ha='center')
    ax.text(43.5, 12.6, "Token Bucket · L2", fontsize=7.4, color="#475569", ha='center')
    ax.text(43.5, 9.6, "0.25 vCPU · 512 MB", fontsize=7.4, color="#64748B", fontweight='bold', ha='center')

    box_pg = patches.FancyBboxPatch((54.5, 7.5), 18.0, 10.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                    facecolor="#FFFFFF", edgecolor="#0D9488", linewidth=0.9)
    ax.add_patch(box_pg)
    ax.text(63.5, 15.2, "postgres-db (PG 16)", fontsize=8.2, fontweight='bold', color="#0F766E", ha='center')
    ax.text(63.5, 12.6, "FORCE RLS · app.tenant_id", fontsize=7.4, color="#475569", ha='center')
    ax.text(63.5, 9.6, "0.50 vCPU · 1.536 MB", fontsize=7.4, color="#0D9488", fontweight='bold', ha='center')

    # Cột 3: Giám sát & Báo cáo (x = 78.0 -> 102.0, w = 24.0)
    box_mon = patches.FancyBboxPatch((78.0, 6), 24.0, 42, boxstyle="round,pad=0.6,rounding_size=0.8",
                                     facecolor="#FFF7ED", edgecolor="#EA580C", linewidth=1.1)
    ax.add_patch(box_mon)
    ax.text(90.0, 45.2, "Giám sát & Phân tích", fontsize=10, fontweight='bold', color="#C2410C", ha='center')
    ax.text(90.0, 42.5, "Thu thập metric tự động", fontsize=7.8, color="#9A3412", ha='center')

    box_prom = patches.FancyBboxPatch((79.7, 29.5), 20.6, 11.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                      facecolor="#FFFFFF", edgecolor="#F97316", linewidth=0.8)
    ax.add_patch(box_prom)
    ax.text(90.0, 38.0, "Prometheus & Actuator", fontsize=8.4, fontweight='bold', color="#9A3412", ha='center')
    ax.text(90.0, 34.8, "• hikaricp_active", fontsize=7.4, color="#475569", ha='center')
    ax.text(90.0, 32.0, "• http_req_duration, rate", fontsize=7.4, color="#475569", ha='center')

    box_proc = patches.FancyBboxPatch((79.7, 17.0), 20.6, 10.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                      facecolor="#FFFFFF", edgecolor="#EA580C", linewidth=0.8)
    ax.add_patch(box_proc)
    ax.text(90.0, 24.5, "Bộ phân tích Tự động", fontsize=8.4, fontweight='bold', color="#9A3412", ha='center')
    ax.text(90.0, 21.5, "• process-ec2-results.py", fontsize=7.4, color="#475569", ha='center')
    ax.text(90.0, 19.0, "• Bóc tách p50, p95 per tenant", fontsize=7.4, color="#475569", ha='center')

    box_rep = patches.FancyBboxPatch((79.7, 7.5), 20.6, 7.5, boxstyle="round,pad=0.4,rounding_size=0.5",
                                     facecolor="#FFFFFF", edgecolor="#DC2626", linewidth=0.8)
    ax.add_patch(box_rep)
    ax.text(90.0, 12.5, "Báo cáo Thực nghiệm", fontsize=8.2, fontweight='bold', color="#991B1B", ha='center')
    ax.text(90.0, 9.8, "Chương 5 (Report_v2.docx)", fontsize=7.4, color="#7F1D1D", ha='center')

    # Mũi tên kết nối
    ax.annotate("", xy=(34.5, 37.2), xytext=(27.5, 37.2),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#2563EB"))
    ax.text(30.0, 38.5, "HTTP", fontsize=7.2, fontweight='bold', color="#2563EB", ha='center')

    ax.annotate("", xy=(53.5, 31.0), xytext=(53.5, 33.5),
                arrowprops=dict(arrowstyle="->", lw=1.4, color="#0D9488"))

    ax.annotate("", xy=(43.5, 18.0), xytext=(43.5, 20.0),
                arrowprops=dict(arrowstyle="<->", lw=1.2, color="#64748B"))

    ax.annotate("", xy=(63.5, 18.0), xytext=(63.5, 20.0),
                arrowprops=dict(arrowstyle="<->", lw=1.2, color="#0D9488"))

    ax.annotate("", xy=(79.7, 35.0), xytext=(72.5, 26.0),
                arrowprops=dict(arrowstyle="->", lw=1.2, color="#EA580C", linestyle=":"))
    ax.text(76.2, 31.5, "Scrape", fontsize=7.0, fontweight='bold', color="#EA580C")

    # Đường k6 summary JSON
    ax.plot([27.5, 27.5, 76.0, 76.0, 79.7], [12.0, 3.5, 3.5, 22.0, 22.0], color="#64748B", lw=1.0, linestyle="--")
    ax.annotate("", xy=(79.7, 22.0), xytext=(77.5, 22.0),
                arrowprops=dict(arrowstyle="->", lw=1.0, color="#64748B"))
    ax.text(51.0, 2.0, "Truyền raw k6 summary JSON sang bộ phân tích", fontsize=7.2, color="#475569", ha='center', style='italic')

    plt.savefig('output/hinh_5_1_pipeline_thuc_nghiem.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_1_pipeline_thuc_nghiem.png")

# ==============================================================================
# HÌNH 5.2: Bản đồ thiết kế thực nghiệm KB-1 đến KB-4 (Cô đọng, 4 mục/cột)
# ==============================================================================
def draw_figure_5_2():
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_xlim(0, 105)
    ax.set_ylim(0, 62)
    ax.axis('off')

    # Main Header
    box_hdr = patches.FancyBboxPatch((12, 55.5), 81, 5.5, boxstyle="round,pad=0.4,rounding_size=0.6",
                                     facecolor="#1E293B", edgecolor="#0F172A", linewidth=1.0)
    ax.add_patch(box_hdr)
    ax.text(52.5, 58.8, "BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM ĐA CHIỀU (KB-1 ĐẾN KB-4)", 
            fontsize=10.5, fontweight='bold', color="#FFFFFF", ha='center')
    ax.text(52.5, 56.6, "Kiểm chứng 4 Khía cạnh Kỹ thuật K1–K4 & Đối ứng 6 Yêu cầu Phi chức năng NFR-01 đến NFR-06", 
            fontsize=7.6, color="#94A3B8", ha='center')

    kbs = [
        {
            "id": "KB-1",
            "title": "Định danh & Ngữ cảnh",
            "sub": "K1 · NFR-01, 06",
            "bg": "#F8FAFC", "border": "#64748B", "hdr": "#334155",
            "goal": "Xác thực biên và chống rò rỉ ranh giới ngữ cảnh luồng.",
            "interventions": [
                "• TenantContextFilter bóc tách claims.",
                "• ThreadLocal try-finally dọn sạch; MDC."
            ],
            "metrics": [
                "• Chặn sai lệch: 100% (HTTP 401/403)",
                "• Rò rỉ ngữ cảnh: 0% trên 1.500 req"
            ],
            "conclusion": "Toàn vẹn định danh đa luồng"
        },
        {
            "id": "KB-2",
            "title": "Cô lập Dữ liệu CSDL",
            "sub": "K2 · NFR-02, 03",
            "bg": "#F0FDFA", "border": "#0D9488", "hdr": "#0F766E",
            "goal": "Phòng thủ chiều sâu CSDL, cô lập bán kính sự cố.",
            "interventions": [
                "• FORCE ROW LEVEL SECURITY.",
                "• SET LOCAL app.tenant_id = UUID."
            ],
            "metrics": [
                "• Chặn bỏ WHERE & IDOR: 100% (0 leak)",
                "• Chi phí RLS vi mô: +0,45 ms (~36%)"
            ],
            "conclusion": "Cơ chế Fail-Closed tuyệt đối"
        },
        {
            "id": "KB-3",
            "title": "Hiệu năng & Kháng Nhiễu",
            "sub": "K3 · NFR-04",
            "bg": "#FFFBEB", "border": "#D97706", "hdr": "#B45309",
            "goal": "Bảo toàn SLA và dập tắt bão tải hàng xóm ồn ào.",
            "interventions": [
                "• TenantRateLimitFilter (Token Bucket).",
                "• Bộ đệm 2 tầng L1 Caffeine + L2 Redis."
            ],
            "metrics": [
                "• p50 tenant chuẩn: giảm còn 60–64 ms",
                "• Thông lượng: tăng +135% (47,67 RPS)"
            ],
            "conclusion": "Dập bão tải, giữ vững SLA"
        },
        {
            "id": "KB-4",
            "title": "Tùy biến & Đồng bộ Đệm",
            "sub": "K4 · NFR-05",
            "bg": "#FAF5FF", "border": "#9333EA", "hdr": "#7E22CE",
            "goal": "Thực thi 3 lớp tùy biến không sửa mã, đồng bộ tức thời.",
            "interventions": [
                "• Động cơ siêu dữ liệu + JSONB động.",
                "• Redis Pub/Sub tenant:config:invalidate."
            ],
            "metrics": [
                "• Nạp đệm L1: 0,12 ms (vs 18,5 ms DB)",
                "• Lan truyền Pub/Sub: 2,45 ± 0,65 ms"
            ],
            "conclusion": "Tùy biến động, đồng bộ tức thời"
        }
    ]

    col_w = 23.5
    gap = 2.0
    start_x = 2.5

    for i, kb in enumerate(kbs):
        cx = start_x + i * (col_w + gap)

        # Card
        card = patches.FancyBboxPatch((cx, 2.5), col_w, 50.5, boxstyle="round,pad=0.5,rounding_size=0.6",
                                      facecolor=kb["bg"], edgecolor=kb["border"], linewidth=1.1)
        ax.add_patch(card)

        # Header Pill
        hdr = patches.FancyBboxPatch((cx + 0.5, 47.8), col_w - 1.0, 4.6, boxstyle="round,pad=0.2,rounding_size=0.4",
                                     facecolor=kb["hdr"], edgecolor=kb["hdr"])
        ax.add_patch(hdr)
        ax.text(cx + col_w/2, 50.7, f"{kb['id']} · {kb['title']}", fontsize=6.8, fontweight='bold', color="#FFFFFF", ha='center')
        ax.text(cx + col_w/2, 48.8, kb['sub'], fontsize=6.3, color="#E2E8F0", ha='center')

        # Connect line from main header
        ax.annotate("", xy=(cx + col_w/2, 52.8), xytext=(52.5, 55.5),
                    arrowprops=dict(arrowstyle="->", lw=0.9, color="#94A3B8"))

        # Section 1: Mục tiêu
        y_cur = 45.5
        ax.text(cx + 1.2, y_cur, "1. MỤC TIÊU:", fontsize=7.4, fontweight='bold', color="#0F172A")
        y_cur -= 2.4
        wrapped_goal = textwrap.fill(kb["goal"], width=27)
        ax.text(cx + 1.2, y_cur, wrapped_goal, fontsize=7.2, color="#334155", va='top')
        y_cur -= (wrapped_goal.count('\n') + 1) * 2.2 + 2.0

        # Section 2: Can thiệp kỹ thuật
        ax.text(cx + 1.2, y_cur, "2. CAN THIỆP KỸ THUẬT:", fontsize=7.4, fontweight='bold', color="#0F172A")
        y_cur -= 2.4
        for itv in kb["interventions"]:
            wrapped_itv = textwrap.fill(itv, width=27)
            lines_cnt = wrapped_itv.count('\n') + 1
            ax.text(cx + 1.2, y_cur, wrapped_itv, fontsize=7.0, color="#334155", va='top')
            y_cur -= lines_cnt * 2.1 + 0.8
        y_cur -= 1.8

        # Section 3: Chỉ số đo
        ax.text(cx + 1.2, y_cur, "3. CHỈ SỐ ĐO CHÍNH:", fontsize=7.4, fontweight='bold', color="#0F172A")
        y_cur -= 2.4
        for met in kb["metrics"]:
            wrapped_met = textwrap.fill(met, width=27)
            lines_cnt = wrapped_met.count('\n') + 1
            ax.text(cx + 1.2, y_cur, wrapped_met, fontsize=7.0, fontweight='bold', color=C_PROPOSED if '100%' in met or '0%' in met or '60–64' in met or '0,12' in met else "#1E293B", va='top')
            y_cur -= lines_cnt * 2.1 + 0.8

        # Section 4: Kết luận (Hộp nổi bật ở đáy)
        p_conc = patches.FancyBboxPatch((cx + 1.0, 3.8), col_w - 2.0, 5.0, boxstyle="round,pad=0.3,rounding_size=0.4",
                                       facecolor="#FFFFFF", edgecolor=kb["border"], linewidth=0.8)
        ax.add_patch(p_conc)
        ax.text(cx + col_w/2, 6.6, "KẾT LUẬN:", fontsize=6.8, fontweight='bold', color="#475569", ha='center')
        ax.text(cx + col_w/2, 4.8, kb["conclusion"], fontsize=7.2, fontweight='bold', color=kb["hdr"], ha='center')

    plt.savefig('output/hinh_5_2_thiet_ke_kb1_kb4.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_2_thiet_ke_kb1_kb4.png")

# ==============================================================================
# HÌNH 5.3: Bằng chứng cô lập K1–K2 (Label trực tiếp, không legend, solid nhã nhặn)
# ==============================================================================
def draw_figure_5_3():
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(9.5, 7.0), dpi=300)
    plt.subplots_adjust(top=0.94, bottom=0.10, hspace=0.48, left=0.30, right=0.96)

    # Panel 1: KB-1 (Biên định danh)
    cases_k1 = [
        "Tomcat pool (1.500 req)",
        "Host lệch JWT claim (200 req)",
        "Thiếu JWT / Sai chữ ký (500 req)"
    ]
    y1 = np.arange(len(cases_k1))
    vals_k1 = [1500, 200, 500]

    bars1 = ax1.barh(y1, vals_k1, height=0.42, color="#0D9488", edgecolor="#0F766E", linewidth=0.8)
    ax1.set_yticks(y1)
    ax1.set_yticklabels(cases_k1, fontsize=8.2, fontweight='500')
    ax1.set_xlabel("Số lượng mẫu kiểm định (mẫu)", fontsize=8.0, fontweight='bold', labelpad=2)
    ax1.set_title("(a) Mặt phẳng Định danh & Ranh giới Ngữ cảnh Luồng (KB-1)", fontsize=8.8, fontweight='bold', pad=4)
    ax1.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax1.set_xlim(0, 2100)

    for i, rect in enumerate(bars1):
        w = rect.get_width()
        tag = "Khớp 100% MDC (0% leak)" if i == 0 else "HTTP 403 (Chặn 100%)" if i == 1 else "HTTP 401 (Chặn 100%)"
        ax1.text(w + 35, rect.get_y() + rect.get_height()/2, f"{w} / {w} mẫu ({tag})", 
                 va='center', ha='left', fontsize=7.8, fontweight='bold', color="#0F766E")

    # Panel 2: KB-2 (Rào chắn CSDL Fail-Closed)
    cases_k2 = [
        "HikariCP thiếu SET LOCAL (100 mẫu)",
        "Đoán UUID thẻ khác - IDOR (300 mẫu)",
        "SELECT bỏ sót WHERE (200 mẫu)"
    ]
    y2 = np.arange(len(cases_k2))
    vals_k2 = [100, 300, 200]

    bars2 = ax2.barh(y2, vals_k2, height=0.42, color="#0D9488", edgecolor="#0F766E", linewidth=0.8)
    ax2.set_yticks(y2)
    ax2.set_yticklabels(cases_k2, fontsize=8.2, fontweight='500')
    ax2.set_xlabel("Số lượng mẫu tiêm lỗi (mẫu)", fontsize=8.0, fontweight='bold', labelpad=2)
    ax2.set_title("(b) Rào chắn CSDL PostgreSQL Fail-Closed & RLS (KB-2)", fontsize=8.8, fontweight='bold', pad=4)
    ax2.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax2.set_xlim(0, 520)

    for i, rect in enumerate(bars2):
        w = rect.get_width()
        tag = "Trả về 0 dòng an toàn (0 leak)" if i == 0 else "HTTP 404/403 (0 leak)" if i == 1 else "FORCE RLS chặn chéo (0 leak)"
        ax2.text(w + 10, rect.get_y() + rect.get_height()/2, f"{w} / {w} mẫu ({tag})", 
                 va='center', ha='left', fontsize=7.8, fontweight='bold', color="#0F766E")

    # Panel 3: Micro-benchmark RLS Overhead
    y3 = np.array([0, 1])
    rls_configs = [
        "Bật SET LOCAL app.tenant_id + FORCE RLS (KB-2.5)",
        "Tắt FORCE RLS, chỉ lọc thủ công WHERE (KB-2.4)"
    ]
    latencies = [1.70, 1.25]
    errors = [0.41, 0.32]

    bars3 = ax3.barh(y3, latencies, xerr=errors, height=0.42, capsize=4,
                     color=['#0D9488', '#64748B'], edgecolor=['#0F766E', '#475569'], linewidth=0.8)
    ax3.set_yticks(y3)
    ax3.set_yticklabels(rls_configs, fontsize=8.2, fontweight='500')
    ax3.invert_yaxis()
    ax3.set_xlabel("Thời gian thực thi truy vấn trung bình (ms) ± Độ lệch chuẩn", fontsize=8.0, fontweight='bold', labelpad=2)
    ax3.set_title("(c) Đo lường Vi mô Chi phí Độ trễ Rào chắn CSDL (RLS Overhead Microbenchmark)", fontsize=8.8, fontweight='bold', pad=4)
    ax3.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax3.set_xlim(0, 2.7)

    ax3.text(1.25 + 0.38, 1, "1,25 ± 0,32 ms (Baseline chuẩn)", va='center', ha='left', fontsize=7.8, fontweight='bold', color="#475569")
    ax3.text(1.70 + 0.46, 0, "1,70 ± 0,41 ms (+0,45 ms ~ 36% vi mô)", va='center', ha='left', fontsize=7.8, fontweight='bold', color="#0D9488")

    fig.text(0.5, 0.018, "* Ghi chú: Mức tăng 0,45 ms là chi phí vi mô cục bộ đo trên tập 500 mẫu truy vấn microbenchmark; tối ưu hóa qua chỉ mục B-Tree (tenant_id).",
             fontsize=7.2, style='italic', color="#64748B", ha='center')

    plt.savefig('output/hinh_5_3_bang_chung_co_lap_k1_k2.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_3_bang_chung_co_lap_k1_k2.png")

# ==============================================================================
# HÌNH 5.4: Noisy neighbor - Phân tích độ trễ từng tenant (2 panels XẾP DỌC)
# ==============================================================================
def draw_figure_5_4():
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9.5, 6.5), dpi=300)
    plt.subplots_adjust(top=0.90, bottom=0.08, hspace=0.38, left=0.28, right=0.96)

    categories = [
        'Gây nhiễu (Aggressor, 20 VUs)',
        'Chuẩn (Finance, 10 VUs)',
        'Lớn (Lotus, 20 VUs)',
        'Vừa (CTU Pool, 15 VUs)',
        'Nhỏ (Acme, 15 VUs)'
    ]
    y_pos = np.arange(len(categories))
    bar_h = 0.36

    p50_base = [156.54, 211.34, 189.25, 187.99, 233.33]
    p50_prop = [13.44, 63.99, 61.12, 60.55, 64.57]

    p95_base = [556.55, 1291.25, 1257.16, 1166.02, 1526.48]
    p95_prop = [124.54, 1138.35, 963.67, 934.57, 1135.73]

    # Panel (a): Độ trễ trung vị p50
    ax1.barh(y_pos - bar_h/2, p50_base, bar_h, label='Baseline (Tắt Cache & Rate Limit)', 
             color='#64748B', edgecolor='#475569', linewidth=0.8)
    ax1.barh(y_pos + bar_h/2, p50_prop, bar_h, label='Đề xuất (Bật Cache 2 tầng & Rate Limit)', 
             color='#0D9488', edgecolor='#0F766E', linewidth=0.8)

    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(categories, fontsize=8.2)
    ax1.invert_yaxis()
    ax1.set_xlabel('Độ trễ trung vị p50 (ms) — Càng thấp càng tốt', fontsize=8.0, fontweight='bold', labelpad=2)
    ax1.set_title('(a) Độ trễ trung vị p50 (Median Latency)', fontsize=8.8, fontweight='bold', pad=4)
    ax1.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax1.set_xlim(0, 275)

    for i in range(len(categories)):
        ax1.text(p50_base[i] + 4, y_pos[i] - bar_h/2, f"{p50_base[i]:.1f} ms", va='center', ha='left', fontsize=7.4, color='#475569', fontweight='bold')
        ax1.text(p50_prop[i] + 4, y_pos[i] + bar_h/2, f"{p50_prop[i]:.1f} ms", va='center', ha='left', fontsize=7.4, color='#0F766E', fontweight='bold')

    # Panel (b): Độ trễ đuôi p95
    ax2.barh(y_pos - bar_h/2, p95_base, bar_h, label='Baseline (Tắt Cache & Rate Limit)', 
             color='#64748B', edgecolor='#475569', linewidth=0.8)
    ax2.barh(y_pos + bar_h/2, p95_prop, bar_h, label='Đề xuất (Bật Cache 2 tầng & Rate Limit)', 
             color='#0D9488', edgecolor='#0F766E', linewidth=0.8)

    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(categories, fontsize=8.2)
    ax2.invert_yaxis()
    ax2.set_xlabel('Độ trễ phân vị đuôi p95 (ms) — Càng thấp càng tốt', fontsize=8.0, fontweight='bold', labelpad=2)
    ax2.set_title('(b) Độ trễ phân vị đuôi p95 (Tail Latency - Bảo toàn cam kết SLA)', fontsize=8.8, fontweight='bold', pad=4)
    ax2.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax2.set_xlim(0, 1800)

    for i in range(len(categories)):
        ax2.text(p95_base[i] + 25, y_pos[i] - bar_h/2, f"{p95_base[i]:.1f} ms", va='center', ha='left', fontsize=7.4, color='#475569', fontweight='bold')
        ax2.text(p95_prop[i] + 25, y_pos[i] + bar_h/2, f"{p95_prop[i]:.1f} ms", va='center', ha='left', fontsize=7.4, color='#0F766E', fontweight='bold')

    # Single unified figure legend at top
    handles, labels = ax1.get_legend_handles_labels()
    fig.legend(handles, labels, loc='upper center', bbox_to_anchor=(0.62, 0.985), ncol=2, 
               fontsize=8.0, frameon=True, edgecolor='#CBD5E1', facecolor='#F8FAFC')

    plt.savefig('output/hinh_5_4_noisy_neighbor_latency.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_4_noisy_neighbor_latency.png")

# ==============================================================================
# HÌNH 5.5: Đối sánh cấu hình kiểm soát tài nguyên (3 panels XẾP DỌC)
# ==============================================================================
def draw_figure_5_5():
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(9.5, 7.2), dpi=300)
    plt.subplots_adjust(top=0.94, bottom=0.07, hspace=0.48, left=0.22, right=0.96)

    configs = [
        'Đầy đủ (Đề xuất)',
        'Chỉ Cache',
        'Chỉ Rate Limit',
        'Baseline'
    ]
    y_pos = np.arange(len(configs))
    bar_h = 0.52
    colors = ['#0D9488', '#3B82F6', '#D97706', '#64748B']
    edge_colors = ['#0F766E', '#1D4ED8', '#B45309', '#475569']

    # Panel 1: Throughput RPS
    tps = [47.67, 35.80, 28.50, 20.29]
    rects1 = ax1.barh(y_pos, tps, bar_h, color=colors, edgecolor=edge_colors, linewidth=0.8)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(configs, fontsize=8.2, fontweight='500')
    ax1.invert_yaxis()
    ax1.set_xlabel('Thông lượng giao dịch an toàn (RPS)', fontsize=8.0, fontweight='bold', labelpad=2)
    ax1.set_title('(a) Thông lượng xử lý giao dịch an toàn (Throughput)', fontsize=8.8, fontweight='bold', pad=4)
    ax1.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax1.set_xlim(0, 60)

    for i, rect in enumerate(rects1):
        w = rect.get_width()
        tag = " (+135%)" if i == 0 else ""
        ax1.text(w + 1.2, rect.get_y() + rect.get_height()/2, f"{w:.2f} RPS{tag}",
                 va='center', ha='left', fontsize=7.8, fontweight='bold', color=colors[i])

    # Panel 2: HikariCP Active Conns
    active_conns = [4, 12, 18, 25]
    rects2 = ax2.barh(y_pos, active_conns, bar_h, color=colors, edgecolor=edge_colors, linewidth=0.8)
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(configs, fontsize=8.2, fontweight='500')
    ax2.invert_yaxis()
    ax2.set_xlabel('Số kết nối CSDL đỉnh điểm (/ 25 kết nối)', fontsize=8.0, fontweight='bold', labelpad=2)
    ax2.set_title('(b) Chiếm dụng HikariCP Connection Pool (Đỉnh điểm)', fontsize=8.8, fontweight='bold', pad=4)
    ax2.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax2.set_xlim(0, 39)

    for i, rect in enumerate(rects2):
        w = rect.get_width()
        tag = " (-84% kết nối)" if i == 0 else " (100% bão hòa, 63 lỗi)" if w == 25 else ""
        ax2.text(w + 0.6, rect.get_y() + rect.get_height()/2, f"{w} / 25{tag}",
                 va='center', ha='left', fontsize=7.8, fontweight='bold', color=colors[i])

    # Panel 3: Throttled requests (HTTP 429)
    blocked_reqs = [11190, 0, 11190, 0]
    rects3 = ax3.barh(y_pos, blocked_reqs, bar_h, color=colors, edgecolor=edge_colors, linewidth=0.8)
    ax3.set_yticks(y_pos)
    ax3.set_yticklabels(configs, fontsize=8.2, fontweight='500')
    ax3.invert_yaxis()
    ax3.set_xlabel('Số yêu cầu Aggressor bị chặn đứng tại biên (HTTP 429)', fontsize=8.0, fontweight='bold', labelpad=2)
    ax3.set_title('(c) Khống chế Hàng xóm Ồn ào tại Cổng biên (HTTP 429 Throttling)', fontsize=8.8, fontweight='bold', pad=4)
    ax3.grid(axis='x', linestyle='--', alpha=0.4, color='#94A3B8')
    ax3.set_xlim(0, 16000)

    for i, rect in enumerate(rects3):
        w = rect.get_width()
        tag = "Chặn 11.190 req (0% lỗi SLA)" if i == 0 else "Chặn 11.190 req" if i == 2 else "0 req (Nghẽn CSDL, rớt kết nối)"
        ax3.text(w + 350, rect.get_y() + rect.get_height()/2, tag,
                 va='center', ha='left', fontsize=7.8, fontweight='bold', color=colors[i])

    plt.savefig('output/hinh_5_5_doi_sanh_cau_hinh.png', dpi=300, bbox_inches='tight')
    plt.close(fig)
    print("✓ Successfully generated: output/hinh_5_5_doi_sanh_cau_hinh.png")

# ==============================================================================
# HÌNH 5.6: Vòng đời cấu hình động K4 (Flow S-shape, text giảm 20%, khớp code)
# ==============================================================================
def draw_figure_5_6():
    fig, ax = plt.subplots(figsize=(10.5, 5.6), dpi=300)
    ax.set_xlim(0, 105)
    ax.set_ylim(0, 56)
    ax.axis('off')

    # Main Header
    box_hdr = patches.FancyBboxPatch((12, 49.5), 81, 5.5, boxstyle="round,pad=0.4,rounding_size=0.6",
                                     facecolor="#1E293B", edgecolor="#0F172A", linewidth=1.0)
    ax.add_patch(box_hdr)
    ax.text(52.5, 52.8, "VÒNG ĐỜI CẤU HÌNH ĐỘNG VÀ ĐỒNG BỘ ĐỆM ĐA TẦNG (KB-4)", 
            fontsize=10.5, fontweight='bold', color="#FFFFFF", ha='center')
    ax.text(52.5, 50.6, "Chu trình khép kín: Đổi cấu hình → Giao dịch DB → Hủy đệm L1 → Pub/Sub → Nạp đệm siêu tốc", 
            fontsize=7.6, color="#94A3B8", ha='center')

    steps = [
        # Hàng 1 (Bước 1 -> 2 -> 3)
        {
            "num": "BƯỚC 1", "title": "Quản trị viên Đổi Cấu hình",
            "x": 3.0, "y": 27.5, "w": 29.5, "h": 20.0,
            "theme": "#0D9488", "bg": "#F0FDFA",
            "body": "Đổi chế độ WIP từ STRICT sang WARN, cập nhật bảng màu thương hiệu hoặc khai báo trường mở rộng.",
            "meta": "Thao tác trên Mặt phẳng Điều khiển"
        },
        {
            "num": "BƯỚC 2", "title": "Commit CSDL PostgreSQL",
            "x": 37.5, "y": 27.5, "w": 29.5, "h": 20.0,
            "theme": "#0D9488", "bg": "#F0FDFA",
            "body": "Cập nhật bảng tenant_kanban_settings (cột settings jsonb). Giao dịch commit thành công bảo đảm ACID.",
            "meta": "Commit CSDL an toàn"
        },
        {
            "num": "BƯỚC 3", "title": "Hủy L1 & Bắn Pub/Sub",
            "x": 72.0, "y": 27.5, "w": 29.5, "h": 20.0,
            "theme": "#7C3AED", "bg": "#FAF5FF",
            "body": "Vô hiệu hóa đệm L1 Caffeine tenant:{id}:config:{ver}. Phát thông điệp lên kênh Redis Pub/Sub.",
            "meta": "Kênh: tenant:config:invalidate"
        },
        # Hàng 2 (Bước 6 <- 5 <- 4)
        {
            "num": "BƯỚC 6", "title": "Áp dụng Ngay trên UI",
            "x": 3.0, "y": 4.5, "w": 29.5, "h": 20.0,
            "theme": "#0D9488", "bg": "#F0FDFA",
            "body": "Người dùng thao tác kéo thẻ vượt hạn mức: hệ thống cho phép với HTTP 200 kèm cảnh báo wipWarning thay vì 422.",
            "meta": "Kiểm chứng: 100% khớp quy tắc"
        },
        {
            "num": "BƯỚC 5", "title": "Nạp Đệm L1 Mới (Lazy)",
            "x": 37.5, "y": 4.5, "w": 29.5, "h": 20.0,
            "theme": "#0D9488", "bg": "#F0FDFA",
            "body": "Yêu cầu kế tiếp gặp L1 Cache Miss → tự động đọc cấu hình mới từ DB và nạp vào bộ nhớ Caffeine.",
            "meta": "Đo đạc: 0,12 ms (vs 18,5 ms DB)"
        },
        {
            "num": "BƯỚC 4", "title": "Lan truyền Cụm API",
            "x": 72.0, "y": 4.5, "w": 29.5, "h": 20.0,
            "theme": "#7C3AED", "bg": "#FAF5FF",
            "body": "Các thể hiện API trong cụm nhận sự kiện qua kênh Redis Pub/Sub và đồng loạt xóa khóa đệm L1 tương ứng.",
            "meta": "Đo đạc: 2,45 ± 0,65 ms"
        }
    ]

    for s in steps:
        # Card
        card = patches.FancyBboxPatch((s["x"], s["y"]), s["w"], s["h"], boxstyle="round,pad=0.5,rounding_size=0.6",
                                      facecolor=s["bg"], edgecolor=s["theme"], linewidth=1.1)
        ax.add_patch(card)

        # Header Badge
        badge = patches.FancyBboxPatch((s["x"] + 1.0, s["y"] + s["h"] - 4.5), 7.8, 3.4, boxstyle="round,pad=0.2,rounding_size=0.4",
                                       facecolor=s["theme"], edgecolor=s["theme"])
        ax.add_patch(badge)
        ax.text(s["x"] + 4.9, s["y"] + s["h"] - 2.8, s["num"], fontsize=7.2, fontweight='bold', color="#FFFFFF", ha='center', va='center')

        # Title
        ax.text(s["x"] + 9.6, s["y"] + s["h"] - 2.8, s["title"], fontsize=7.8, fontweight='bold', color="#0F172A", va='center')

        # Body Text (giảm 20% text)
        wrapped_body = textwrap.fill(s["body"], width=34)
        ax.text(s["x"] + 1.2, s["y"] + s["h"] - 6.2, wrapped_body, fontsize=7.2, color="#334155", va='top')

        # Meta footer
        p_meta = patches.FancyBboxPatch((s["x"] + 1.2, s["y"] + 1.2), s["w"] - 2.4, 3.8, boxstyle="round,pad=0.2,rounding_size=0.3",
                                        facecolor="#FFFFFF", edgecolor=s["theme"], linewidth=0.8)
        ax.add_patch(p_meta)
        fw = 'bold' if 'Đo đạc' in s['meta'] or 'Kiểm chứng' in s['meta'] else 'normal'
        ax.text(s["x"] + s["w"]/2, s["y"] + 3.1, s["meta"], fontsize=7.2, fontweight=fw, color=s["theme"], ha='center', va='center')

    # Arrows between cards (S-shape flow)
    # 1 -> 2
    ax.annotate("", xy=(37.5, 37.5), xytext=(32.5, 37.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#64748B"))
    # 2 -> 3
    ax.annotate("", xy=(72.0, 37.5), xytext=(67.0, 37.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#64748B"))
    # 3 -> 4 (Down)
    ax.annotate("", xy=(86.75, 24.5), xytext=(86.75, 27.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#7C3AED"))
    # 4 -> 5
    ax.annotate("", xy=(67.0, 14.5), xytext=(72.0, 14.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#64748B"))
    # 5 -> 6
    ax.annotate("", xy=(32.5, 14.5), xytext=(37.5, 14.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#64748B"))

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
