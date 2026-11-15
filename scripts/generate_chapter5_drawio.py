# -*- coding: utf-8 -*-
"""
Script to generate standard .drawio XML files for Chapter 5 (Figures 5.1 to 5.5).
Output directory: diagrams/chapter5/
"""

import os
import html

def escape(txt):
    return html.escape(txt)

def create_cell(id_val, value, style, x, y, width, height, parent="1", as_edge=False, source=None, target=None):
    label = escape(value)
    if as_edge:
        edge_attr = f'edge="1" source="{source}" target="{target}"' if source and target else 'edge="1"'
        return f'        <mxCell id="{id_val}" value="{label}" style="{style}" {edge_attr} parent="{parent}">\n          <mxGeometry relative="1" as="geometry" />\n        </mxCell>'
    else:
        return f'        <mxCell id="{id_val}" value="{label}" style="{style}" vertex="1" parent="{parent}">\n          <mxGeometry x="{x}" y="{y}" width="{width}" height="{height}" as="geometry" />\n        </mxCell>'

def build_drawio_file(diagram_name, cells_xml, width=1500, height=1000):
    diag_id = f"diag_{abs(hash(diagram_name)) % 10000000}"
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-11-15T13:00:00.000Z" agent="Mozilla/5.0" version="21.0.0" type="device">
  <diagram id="{diag_id}" name="{escape(diagram_name)}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{cells_xml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_multi_diagram_drawio(diagrams_list, width=1500, height=1000):
    xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-11-15T13:00:00.000Z" agent="Mozilla/5.0" version="21.0.0" type="device">']
    for idx, (diag_name, cells_xml) in enumerate(diagrams_list):
        diag_id = f"diag_ch5_{idx+1}"
        xml_parts.append(f'''  <diagram id="{diag_id}" name="{escape(diag_name)}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{cells_xml}
      </root>
    </mxGraphModel>
  </diagram>''')
    xml_parts.append('</mxfile>')
    return '\n'.join(xml_parts)

# ==============================================================================
# 1. HÌNH 5.1: KIẾN TRÚC MÔI TRƯỜNG THỰC NGHIỆM VÀ HỆ THỐNG THU THẬP SỐ LIỆU
# ==============================================================================
def get_hinh_5_1_xml():
    cells = []
    
    # Outer frame: AWS EC2 Host
    cells.append(create_cell(
        "ec2_host", 
        "HẠ TẦNG MÁY CHỦ AWS EC2: m7i-flex.large (2 vCPU, 8 GiB RAM, OS: Ubuntu 24.04 LTS)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F8FAFC;strokeColor=#1E3A8A;strokeWidth=2;fontSize=14;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        30, 20, 1340, 720
    ))
    
    # Left container: k6 Workload Generator
    cells.append(create_cell(
        "k6_box", 
        "BỘ SINH TẢI k6 v0.50 (80 VUs ĐỒNG THỜI)\nQuy trình: 30s Warmup → 60s Đo chính thức → 25s Cooldown", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#3B82F6;strokeWidth=2;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=40;", 
        60, 80, 360, 620, parent="ec2_host"
    ))
    
    # 5 Tenants in k6
    tenants = [
        ("t1", "Thuê bao Nhỏ (t-acme)\n15 VUs | 1 Bảng | 200 Thẻ\nLuật: WIP STRICT (limit=2)", "#DBEAFE", "#1D4ED8", 140),
        ("t2", "Thuê bao Vừa (pool-demo)\n15 VUs | 4 Bảng | 500 Thẻ\nLuật: WIP WARN (cảnh báo)", "#E0E7FF", "#4338CA", 230),
        ("t3", "Thuê bao Lớn (t-lotus)\n20 VUs | 10 Bảng | 1.000 Thẻ\nTrường mở rộng JSONB | WARN", "#EDE9FE", "#6D28D9", 320),
        ("t4", "Thuê bao Chuẩn (t-finance)\n10 VUs | 2 Bảng | 300 Thẻ\nLuật: WIP STRICT (chặn cứng)", "#DCFCE7", "#15803D", 410),
        ("t5", "Thuê bao Gây nhiễu (t-aggressor)\n20 VUs | Bão tải đột biến dồn dập\n1.800–3.000 req/phút không độ trễ", "#FFE4E6", "#BE123C", 500),
    ]
    for tid, tlabel, tfill, tstroke, ty in tenants:
        cells.append(create_cell(
            tid, tlabel, 
            f"rounded=1;whiteSpace=wrap;html=1;fillColor={tfill};strokeColor={tstroke};strokeWidth=1.5;fontSize=11;fontStyle=0;align=center;", 
            80, ty, 320, 75, parent="ec2_host"
        ))
        
    # Center container: Docker Compose Cluster (Ghim cgroups)
    cells.append(create_cell(
        "docker_box", 
        "CỤM DOCKER COMPOSE ĐA THUÊ BAO (GHIM CỨNG HẠN MỨC CGROUPS)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F0FDFA;strokeColor=#0D9488;strokeWidth=2;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=40;", 
        460, 80, 480, 620, parent="ec2_host"
    ))
    
    # Components inside Docker Compose
    cells.append(create_cell(
        "caddy", 
        "Cổng biên: Caddy Reverse Proxy / kanban-web\n• Hạn mức: 0.25 vCPU, 256 MB RAM\n• Điều hướng TLS, chấm dứt kết nối, phục vụ tĩnh React 18", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#CCFBF1;strokeColor=#0F766E;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        485, 140, 430, 70, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "api", 
        "Dịch vụ lõi: kanban-api (Spring Boot 3 + Java 21)\n• Hạn mức cgroups: 1.25 vCPU (Đỉnh đo 127.9%), 2.560 MB RAM (Đo 1.016 MB)\n• Hồ luồng Tomcat: 60 worker threads | HikariCP pool: max 25 kết nối\n• L1 Caffeine W-TinyLFU: Nạp cấu hình 0.12 ms (nhanh gấp 150 lần DB)\n• Middleware: TenantContextFilter (JWT + MDC) & TenantRateLimitFilter", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        485, 235, 430, 115, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "redis", 
        "Bộ đệm phân tán & Thông điệp: redis-cache (Redis 7)\n• Hạn mức: 0.25 vCPU, 512 MB RAM\n• Thuật toán Token Bucket: 1.200 req/min (refill 20/s, burst 120)\n• Bộ đệm L2 Tenant-partitioned | Redis Pub/Sub: tenant:config:invalidate", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEE2E2;strokeColor=#B91C1C;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        485, 375, 430, 85, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "postgres", 
        "Cơ sở dữ liệu: postgres-db (PostgreSQL 16)\n• Hạn mức: 0.50 vCPU, 1.536 MB RAM | Lược đồ dùng chung (Shared Table)\n• Tài khoản ứng dụng: NOBYPASSRLS (Rào chắn Fail-Closed mặc định)\n• Chính sách bảo mật cấp dòng: FORCE ROW LEVEL SECURITY trên mọi bảng\n• Thiết lập biến phiên giao dịch nguyên tử: SET LOCAL app.tenant_id = :id", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#E0F2FE;strokeColor=#0369A1;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        485, 485, 430, 105, parent="ec2_host"
    ))
    
    # Right container: Telemetry & Monitoring Pipeline
    cells.append(create_cell(
        "telemetry_box", 
        "HỆ THỐNG THU THẬP SỐ LIỆU TỰ ĐỘNG", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FAF5FF;strokeColor=#7E22CE;strokeWidth=2;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=40;", 
        980, 80, 360, 620, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "cadvisor", 
        "Giám sát vùng chứa: cAdvisor & Telemetry Script\n• Thu thập CPU, Memory, I/O mỗi 5 giây (N=17 mẫu)\n• Ghi nhận đỉnh CPU: API 127.9%, Host CPU: 94% (188%/200%)\n• Lưu trữ: experiments/results/ec2/telemetry.csv", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#F3E8FF;strokeColor=#6B21A8;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        1005, 140, 310, 85, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "prom", 
        "Giám sát ứng dụng: Prometheus Scrape Actuator\n• Thu thập Spring Boot Micrometer Metrics\n• HikariCP Active/Idle Connections (đo thực tế 4/25)\n• Caffeine Hit/Miss Ratio (đo thực tế 76–81%)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#F3E8FF;strokeColor=#6B21A8;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        1005, 250, 310, 85, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "k6_reporter", 
        "Trích xuất số liệu k6: JSON Summary Reporter\n• Đo lường p50, p95, p99 độc lập theo từng tag tenant\n• Thống kê HTTP reqs: 20.423 reqs (327.56 RPS tổng)\n• Xuất kết quả: proposed_summary.json & baseline_summary.json", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#F3E8FF;strokeColor=#6B21A8;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        1005, 360, 310, 85, parent="ec2_host"
    ))
    
    cells.append(create_cell(
        "data_lake", 
        "Kho lưu trữ kết quả & Đối soát nghiên cứu\n• Baseline vs Proposed Benchmark (EC2 run commit 20d4dfb)\n• Bằng chứng khách quan khép kín 7 thách thức thiết kế", 
        "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#E2E8F0;strokeColor=#475569;strokeWidth=1.5;fontSize=11;align=center;", 
        1055, 480, 210, 110, parent="ec2_host"
    ))
    
    # Connections / Arrows
    cells.append(create_cell("e1", "HTTP/REST (80 VUs)", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#2563EB;strokeWidth=2;", 0, 0, 0, 0, as_edge=True, source="k6_box", target="caddy"))
    cells.append(create_cell("e2", "Proxy Pass", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#0D9488;strokeWidth=2;", 0, 0, 0, 0, as_edge=True, source="caddy", target="api"))
    cells.append(create_cell("e3", "Token Bucket & Pub/Sub", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#DC2626;strokeWidth=2;", 0, 0, 0, 0, as_edge=True, source="api", target="redis"))
    cells.append(create_cell("e4", "SET LOCAL + RLS (HikariCP)", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#0284C7;strokeWidth=2;", 0, 0, 0, 0, as_edge=True, source="api", target="postgres"))
    cells.append(create_cell("e5", "Scrape metrics", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#7C3AED;strokeWidth=1.5;dashed=1;", 0, 0, 0, 0, as_edge=True, source="api", target="prom"))
    cells.append(create_cell("e6", "Stats polling", "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#7C3AED;strokeWidth=1.5;dashed=1;", 0, 0, 0, 0, as_edge=True, source="docker_box", target="cadvisor"))
    
    return '\n'.join(cells)

# ==============================================================================
# 2. HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ KB-1 ĐẾN KB-4
# ==============================================================================
def get_hinh_5_2_xml():
    cells = []
    
    # Outer frame
    cells.append(create_cell(
        "frame_52", 
        "HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ CÁC KỊCH BẢN KIỂM ĐỊNH KB-1 ĐẾN KB-4", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1E3A8A;strokeWidth=2;fontSize=14;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        20, 20, 1360, 720
    ))
    
    columns = [
        {
            "id": "col_kb1", "name": "KỊCH BẢN KB-1\nKiểm định Ranh giới Định danh",
            "k_nfr": "K1: Phân giải Ngữ cảnh luồng\nNFR-01: Toàn vẹn Ranh giới Định danh",
            "target": "MỤC TIÊU CỐT LÕI:\nXác thực token JWT tại biên, thiết lập ngữ cảnh luồng ThreadLocal bất biến và ngăn rò rỉ ngữ cảnh khi luân chuyển tải.",
            "test": "KỊCH BẢN TIÊM LỖI:\n• 500 req JWT thiếu/sai chữ ký\n• 200 req tiêu đề Host lệch tenant\n• 1.500 req luân chuyển trên hồ luồng Tomcat (60 threads)",
            "mechanism": "CƠ CHẾ KỸ THUẬT:\nTenantContextFilter + JWT Parser\n+ Khối lệnh try ... finally bắt buộc giải phóng ThreadLocal.",
            "result": "KẾT QUẢ ĐẠT ĐƯỢC:\n✓ 100% chặn HTTP 401 (500/500)\n✓ 100% chặn HTTP 403 (200/200)\n✓ 100% khớp X-Tenant-ID & MDC\n✓ 0% rò rỉ ngữ cảnh chéo.",
            "color_hdr": "#1E40AF", "color_bg": "#EFF6FF", "x": 50
        },
        {
            "id": "col_kb2", "name": "KỊCH BẢN KB-2\nKiểm định Rào chắn CSDL & Fail-Closed",
            "k_nfr": "K2: Cô lập CSDL cấp dòng & Bộ đệm\nNFR-02, NFR-03: Không rò rỉ, Phụ trội RLS",
            "target": "MỤC TIÊU CỐT LÕI:\nBảo đảm an toàn dữ liệu tuyệt đối ở tầng lưu trữ dùng chung, kích hoạt Fail-Closed và định lượng chi phí vi mô của RLS.",
            "test": "KỊCH BẢN TIÊM LỖI:\n• 200 câu SELECT cố tình bỏ WHERE\n• 300 mẫu IDOR đoán UUID thẻ chéo\n• 100 truy vấn cố tình bỏ SET LOCAL\n• Microbenchmark 500 truy vấn đo RLS",
            "mechanism": "CƠ CHẾ KỸ THUẬT:\nPostgreSQL FORCE ROW LEVEL SECURITY\n+ Tài khoản NOBYPASSRLS\n+ Biến phiên SET LOCAL app.tenant_id\n+ Chỉ mục B-Tree dẫn đầu bởi tenant_id.",
            "result": "KẾT QUẢ ĐẠT ĐƯỢC:\n✓ 0 bản ghi rò rỉ (0 leak)\n✓ 100% chặn IDOR (404/403)\n✓ Fail-Closed trả về rỗng (0 dòng)\n✓ Độ trễ RLS vi mô: +0.45 ms (~36%).",
            "color_hdr": "#047857", "color_bg": "#ECFDF5", "x": 380
        },
        {
            "id": "col_kb3", "name": "KỊCH BẢN KB-3\nKháng Láng giềng Ồn ào & Hiệu năng",
            "k_nfr": "K3: Điều tiết Lưu lượng & Đệm 2 tầng\nNFR-04: Bảo toàn cam kết SLA < 500 ms",
            "target": "MỤC TIÊU CỐT LÕI:\nDập tắt bão tải của Aggressor tại biên, bảo toàn độ trễ p50/p95 cho các tenant bình thường và giải tỏa áp lực cho CSDL.",
            "test": "KỊCH BẢN TIÊM LỖI:\n• Aggressor phát tải 1.800–3.000 req/phút dồn dập (20 VUs)\n• 4 tenant thông thường gửi tải hợp lệ (60 VUs)\n• Khảo sát bóc tách 4 cấu hình kiểm soát",
            "mechanism": "CƠ CHẾ KỸ THUẬT:\nRedis Token Bucket (1.200 req/min)\n+ Bộ đệm 2 tầng: L1 Caffeine W-TinyLFU\n+ L2 Redis Tenant-partitioned\n+ Hồ kết nối HikariCP (max 25).",
            "result": "KẾT QUẢ ĐẠT ĐƯỢC:\n✓ p50 giảm 88% (22.87–26.92 ms)\n✓ p95 giảm 80% (242–276 ms < 500ms)\n✓ Chặn 16.423 req 429 (92.66% bão tải)\n✓ Thông lượng: 327.56 RPS (+223%).",
            "color_hdr": "#B45309", "color_bg": "#FFFBEB", "x": 710
        },
        {
            "id": "col_kb4", "name": "KỊCH BẢN KB-4\nTùy biến Động 3 Lớp & Đồng bộ",
            "k_nfr": "K4: Động cơ Siêu dữ liệu & Vòng đời\nNFR-05, NFR-06: Tùy biến, Nhất quán đệm",
            "target": "MỤC TIÊU CỐT LÕI:\nVận hành đồng thời các tổ chức có quy tắc nghiệp vụ đối lập trên 1 bộ mã nguồn, xác thực schema JSONB và đồng bộ hủy đệm.",
            "test": "KỊCH BẢN TIÊM LỖI:\n• GET /tenant-settings/kanban (19 req)\n• POST task customData JSONB (19 req)\n• Di chuyển thẻ vi phạm WIP STRICT (limit=2, 19 req thử nghiệm)\n• Quản trị viên đổi luật và bắn Pub/Sub",
            "mechanism": "CƠ CHẾ KỸ THUẬT:\nĐộng cơ siêu dữ liệu JSONB động\n+ Spring Data JPA validation\n+ Kênh Redis Pub/Sub tenant:config:invalidate\n+ Nạp Lazy Load L1 Caffeine.",
            "result": "KẾT QUẢ ĐẠT ĐƯỢC:\n✓ 19/19 GET nạp config đạt 200 OK\n✓ 19/19 POST JSONB đạt 201 Created\n✓ 17/19 lượt vượt WIP bị chặn 422 (89.5%)\n✓ Lan truyền hủy đệm Pub/Sub: 2.45 ms.",
            "color_hdr": "#7E22CE", "color_bg": "#FAF5FF", "x": 1040
        }
    ]
    
    for c in columns:
        cx = c["x"]
        # Column swimlane
        cells.append(create_cell(
            c["id"], c["name"],
            f"swimlane;whiteSpace=wrap;html=1;fillColor={c['color_bg']};strokeColor={c['color_hdr']};strokeWidth=2;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=45;fontColor=#FFFFFF;fillColor2={c['color_hdr']};",
            cx, 80, 300, 620, parent="frame_52"
        ))
        # Layer 1: K / NFR
        cells.append(create_cell(
            f"{c['id']}_l1", c["k_nfr"],
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor={c['color_hdr']};strokeWidth=1.5;fontSize=11;fontStyle=1;align=center;",
            cx+15, 135, 270, 50, parent="frame_52"
        ))
        # Layer 2: Target
        cells.append(create_cell(
            f"{c['id']}_l2", c["target"],
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor={c['color_hdr']};strokeWidth=1;fontSize=10;align=left;spacingLeft=8;",
            cx+15, 195, 270, 85, parent="frame_52"
        ))
        # Layer 3: Test Scenario
        cells.append(create_cell(
            f"{c['id']}_l3", c["test"],
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor={c['color_hdr']};strokeWidth=1;fontSize=10;align=left;spacingLeft=8;",
            cx+15, 290, 270, 105, parent="frame_52"
        ))
        # Layer 4: Mechanism
        cells.append(create_cell(
            f"{c['id']}_l4", c["mechanism"],
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor={c['color_hdr']};strokeWidth=1;fontSize=10;align=left;spacingLeft=8;",
            cx+15, 405, 270, 95, parent="frame_52"
        ))
        # Layer 5: Quantitative Result
        cells.append(create_cell(
            f"{c['id']}_l5", c["result"],
            f"rounded=1;whiteSpace=wrap;html=1;fillColor=#F8FAFC;strokeColor={c['color_hdr']};strokeWidth=2;fontSize=10.5;fontStyle=1;align=left;spacingLeft=8;",
            cx+15, 510, 270, 120, parent="frame_52"
        ))
        
    return '\n'.join(cells)

# ==============================================================================
# 3. HÌNH 5.3: KẾT QUẢ KIỂM ĐỊNH ĐỊNH DANH, CÔ LẬP CSDL VÀ CHI PHÍ RLS (KB-1 & KB-2)
# ==============================================================================
def get_hinh_5_3_xml():
    cells = []
    
    cells.append(create_cell(
        "frame_53", 
        "HÌNH 5.3: KẾT QUẢ KIỂM ĐỊNH ĐỊNH DANH (KB-1), CÔ LẬP CSDL FAIL-CLOSED (KB-2) VÀ CHI PHÍ THỰC THI RLS", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1E3A8A;strokeWidth=2;fontSize=14;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        20, 20, 1360, 680
    ))
    
    # Panel a: KB-1 Thread Context & Token
    cells.append(create_cell(
        "panel_a", 
        "Panel a: Kiểm định ranh giới ngữ cảnh luồng (KB-1)\n(Mặt phẳng Dữ liệu & Hồ luồng Tomcat)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#2563EB;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        50, 75, 400, 590, parent="frame_53"
    ))
    
    cells.append(create_cell(
        "pa_c1", 
        "Tiêm lỗi JWT hỏng / Không chữ ký\n• Số mẫu thử nghiệm: 500 yêu cầu\n• Kết quả: 500/500 bị chặn đứng ngay tại biên\n• Mã phản hồi: HTTP 401 Unauthorized\n• Tỷ lệ phòng vệ đúng: 100.0% (0 rò rỉ)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DBEAFE;strokeColor=#1D4ED8;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        70, 130, 360, 95, parent="frame_53"
    ))
    cells.append(create_cell(
        "pa_c2", 
        "Tiêm lỗi Host Header sai lệch định danh\n• Số mẫu thử nghiệm: 200 yêu cầu\n• Kết quả: 200/200 bị từ chối truy cập\n• Mã phản hồi: HTTP 403 Forbidden\n• Tỷ lệ phòng vệ đúng: 100.0% (0 rò rỉ)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DBEAFE;strokeColor=#1D4ED8;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        70, 245, 360, 95, parent="frame_53"
    ))
    cells.append(create_cell(
        "pa_c3", 
        "Tải luân chuyển trên hồ luồng Tomcat (60 threads)\n• Áp lực tải: 1.500 yêu cầu đan xen từ 5 nhóm tenant\n• Kiểm tra khối try ... finally giải phóng ThreadLocal\n• Tỷ lệ khớp tenant_id yêu cầu, tiêu đề X-Tenant-ID\n  và nhãn MDC trong nhật ký: 100.0% (1.500 / 1.500)\n• Tỷ lệ nhiễm bẩn ngữ cảnh luồng: 0.0% Tuyệt đối", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#15803D;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        70, 360, 360, 130, parent="frame_53"
    ))
    cells.append(create_cell(
        "pa_sum", 
        "KẾT LUẬN PANEL A: Cơ chế phòng thủ biên kết hợp ThreadLocal try/finally bảo đảm ranh giới ngữ cảnh an toàn 100%.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF9C3;strokeColor=#CA8A04;strokeWidth=1;fontSize=10.5;fontStyle=1;align=center;", 
        70, 510, 360, 60, parent="frame_53"
    ))
    
    # Panel b: KB-2 Database Fail-Closed
    cells.append(create_cell(
        "panel_b", 
        "Panel b: Rào chắn CSDL Fail-Closed (KB-2)\n(PostgreSQL 16 FORCE RLS & NOBYPASSRLS)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#ECFDF5;strokeColor=#059669;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        480, 75, 420, 590, parent="frame_53"
    ))
    cells.append(create_cell(
        "pb_c1", 
        "Truy vấn cố tình bỏ mệnh đề WHERE tenant_id\n• Câu lệnh: SELECT * FROM cards;\n• Số mẫu tiêm lỗi: 200 truy vấn\n• Kết quả: FORCE RLS tự động chèn bộ lọc cấp nhân\n• Số bản ghi rò rỉ: 0 bản ghi (0 leak tuyệt đối)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#D1FAE5;strokeColor=#047857;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        505, 130, 370, 95, parent="frame_53"
    ))
    cells.append(create_cell(
        "pb_c2", 
        "Tấn công IDOR đoán UUID thẻ chéo tenant\n• Kịch bản: t-acme gọi API với UUID thuộc t-lotus\n• Số mẫu thử nghiệm: 300 lần thử\n• Kết quả: 300/300 bị vô hiệu hóa\n• Mã phản hồi: HTTP 404 Not Found hoặc 403 Forbidden\n• Tỷ lệ ngăn chặn: 100.0% (0 dữ liệu rò rỉ)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#D1FAE5;strokeColor=#047857;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        505, 245, 370, 105, parent="frame_53"
    ))
    cells.append(create_cell(
        "pb_c3", 
        "Truy vấn HikariCP bị cố tình bỏ SET LOCAL\n• Kịch bản: Không tiêm biến phiên SET LOCAL app.tenant_id\n• Số mẫu kiểm thử: 100 truy vấn đối chứng\n• Kết quả: Cơ chế Fail-Closed kích hoạt an toàn mặc định\n• Dữ liệu trả về: Tập kết quả rỗng (0 dòng) | 0% rò rỉ", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        505, 370, 370, 95, parent="frame_53"
    ))
    cells.append(create_cell(
        "pb_sum", 
        "KẾT LUẬN PANEL B: Cơ chế Fail-Closed bảo vệ dữ liệu thành công ngay cả khi lập trình viên bỏ sót WHERE hoặc bị tấn công IDOR.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF9C3;strokeColor=#CA8A04;strokeWidth=1;fontSize=10.5;fontStyle=1;align=center;", 
        505, 510, 370, 60, parent="frame_53"
    ))
    
    # Panel c: RLS Microbenchmark Latency
    cells.append(create_cell(
        "panel_c", 
        "Panel c: Chi phí Vi mô Thực thi RLS\n(Đo lường qua EXPLAIN ANALYZE, N=500 mẫu)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FAF5FF;strokeColor=#7C3AED;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        930, 75, 420, 590, parent="frame_53"
    ))
    cells.append(create_cell(
        "pc_bar1", 
        "TRẠNG THÁI CƠ SỞ (TẮT RLS):\nĐộ trễ trung bình: 1.25 ± 0.32 ms\n(Chỉ lọc WHERE thủ công ở tầng ứng dụng)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#475569;strokeWidth=1.5;fontSize=11;fontStyle=1;align=center;", 
        960, 140, 360, 60, parent="frame_53"
    ))
    cells.append(create_cell(
        "pc_bar2", 
        "TRẠNG THÁI BẬT ĐẦY ĐỦ RLS (ĐỀ XUẤT):\nĐộ trễ trung bình: 1.70 ± 0.41 ms\n(Bật SET LOCAL app.tenant_id + FORCE RLS hai lớp)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DDD6FE;strokeColor=#6D28D9;strokeWidth=2;fontSize=11;fontStyle=1;align=center;", 
        960, 220, 360, 65, parent="frame_53"
    ))
    cells.append(create_cell(
        "pc_delta", 
        "PHỤ TRỘI ĐỘ TRỄ VI MÔ:\nΔ = +0.45 ms (~36% trong microbenchmark)\n• Tối ưu hóa bởi chỉ mục tổ hợp B-Tree: (tenant_id, id)\n• Hoàn toàn không gây nút thắt cổ chai hệ thống\n• Thỏa mãn ngưỡng NFR-03 về chi phí bảo mật", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#F3E8FF;strokeColor=#7C3AED;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        960, 310, 360, 105, parent="frame_53"
    ))
    cells.append(create_cell(
        "pc_cache", 
        "PHÂN VÙNG BỘ NHỚ ĐỆM (KB-2.6):\n• Kiểm tra tiền tố khóa: tenant:{tenant_id}:*\n• 300 lần thử nghiệm thu hồi và kiểm tra chéo\n• Kết quả: Cách ly hoàn toàn, 0 rò rỉ khóa giữa các tenant", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        960, 435, 360, 85, parent="frame_53"
    ))
    cells.append(create_cell(
        "pc_sum", 
        "KẾT LUẬN PANEL C: Chi phí bảo mật RLS được giữ ở mức vi mô rất nhỏ (+0.45 ms) và thỏa mãn NFR-03.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF9C3;strokeColor=#CA8A04;strokeWidth=1;fontSize=10.5;fontStyle=1;align=center;", 
        960, 540, 360, 50, parent="frame_53"
    ))
    
    return '\n'.join(cells)

# ==============================================================================
# 4. HÌNH 5.4: ĐỘ TRỄ PHÂN TẦNG VÀ ĐIỀU TIẾT LƯU LƯỢNG AGGRESSOR (KB-3)
# ==============================================================================
def get_hinh_5_4_xml():
    cells = []
    
    cells.append(create_cell(
        "frame_54", 
        "HÌNH 5.4: KẾT QUẢ KIỂM ĐỊNH ĐỘ TRỄ PHÂN TẦNG VÀ ĐIỀU TIẾT LƯU LƯỢNG THUÊ BAO GÂY NHIỄU (KB-3)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1E3A8A;strokeWidth=2;fontSize=14;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        20, 20, 1360, 720
    ))
    
    # Panel a: p50 latency
    cells.append(create_cell(
        "p54_a", 
        "Panel a: Độ trễ trung vị p50 (Baseline vs Proposed) [ms]\n(Hạ độ trễ ~88% cho toàn bộ các bên thuê bao hợp lệ)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#2563EB;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        45, 75, 410, 620, parent="frame_54"
    ))
    p50_data = [
        ("Nhỏ (t-acme, 15 VUs)", "233.33 ms", "26.92 ms", "-88.5%", 125),
        ("Vừa (pool-demo, 15 VUs)", "187.99 ms", "23.98 ms", "-87.2%", 225),
        ("Lớn (t-lotus, 20 VUs)", "189.25 ms", "22.87 ms", "-87.9%", 325),
        ("Chuẩn (t-finance, 10 VUs)", "211.34 ms", "25.43 ms", "-88.0%", 425),
        ("Gây nhiễu (Aggressor)", "156.54 ms", "6.56 ms", "-95.8%", 525),
    ]
    for idx, (tname, base_val, prop_val, dec, y_pos) in enumerate(p50_data):
        cells.append(create_cell(
            f"p50_{idx}", 
            f"<b>{tname}</b><br/>• Baseline: <font color='#64748B'>{base_val}</font><br/>• Proposed: <font color='#0D9488'><b>{prop_val}</b></font> (Giảm {dec})", 
            "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#93C5FD;strokeWidth=1;fontSize=11;align=left;spacingLeft=10;", 
            65, y_pos, 370, 75, parent="frame_54"
        ))
    cells.append(create_cell(
        "p50_sum", 
        "p50 4 tenant bình thường: 22.87 – 26.92 ms (giảm bình quân 87.9%).", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;strokeWidth=1.5;fontSize=11;fontStyle=1;align=center;", 
        65, 620, 370, 50, parent="frame_54"
    ))
    
    # Panel b: p95 latency & SLA threshold
    cells.append(create_cell(
        "p54_b", 
        "Panel b: Độ trễ phân vị đuôi p95 & Ngưỡng SLA [ms]\n(Co gọn về 242–276 ms, hoàn toàn bảo toàn cam kết SLA < 500 ms)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F0FDF4;strokeColor=#16A34A;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        485, 75, 410, 620, parent="frame_54"
    ))
    p95_data = [
        ("Nhỏ (t-acme, 15 VUs)", "1526.48 ms", "253.67 ms", "-83.4%", 125),
        ("Vừa (pool-demo, 15 VUs)", "1166.02 ms", "253.88 ms", "-78.2%", 225),
        ("Lớn (t-lotus, 20 VUs)", "1257.16 ms", "242.17 ms", "-80.7%", 325),
        ("Chuẩn (t-finance, 10 VUs)", "1291.25 ms", "276.84 ms", "-78.6%", 425),
        ("Gây nhiễu (Aggressor)", "556.55 ms", "43.39 ms", "-92.2%", 525),
    ]
    for idx, (tname, base_val, prop_val, dec, y_pos) in enumerate(p95_data):
        cells.append(create_cell(
            f"p95_{idx}", 
            f"<b>{tname}</b><br/>• Baseline: <font color='#EF4444'>{base_val}</font><br/>• Proposed: <font color='#059669'><b>{prop_val}</b></font> (Giảm {dec})", 
            "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#86EFAC;strokeWidth=1;fontSize=11;align=left;spacingLeft=10;", 
            505, y_pos, 370, 75, parent="frame_54"
        ))
    cells.append(create_cell(
        "p95_sla", 
        "NGƯỠNG THAM CHIẾU CAM KẾT SLA: p95 < 500 ms (0 lỗi SLA vi phạm / 2.613 req). Phân vị cực đoan p99 ~1.99–2.45s do CPU chạm trần.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;strokeWidth=1.5;fontSize=10.5;fontStyle=1;align=center;", 
        505, 620, 370, 55, parent="frame_54"
    ))
    
    # Panel c: Rate Limiting & Telemetry
    cells.append(create_cell(
        "p54_c", 
        "Panel c: Điều tiết Lưu lượng & Telemetry CPU/RAM\n(Chặn 92.66% bão tải & Giải mã 94% CPU contention)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FFFBEB;strokeColor=#D97706;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        925, 75, 415, 620, parent="frame_54"
    ))
    cells.append(create_cell(
        "pc_agg_rate", 
        "ĐIỀU TIẾT LƯU LƯỢNG AGGRESSOR:\n• Tổng số request Aggressor: 17.723 requests\n• Bị chặn bằng HTTP 429: 16.423 requests (92.66%)\n• Lọt qua hạn mức Token Bucket: 1.300 requests (7.34%)\n• Tốc độ chặn tức thời của Redis: 263.40 req/giây\n• 4 tenant hợp lệ: 2.613/2.613 thành công 100% (0 lỗi)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEE2E2;strokeColor=#DC2626;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        945, 125, 375, 115, parent="frame_54"
    ))
    cells.append(create_cell(
        "pc_throughput", 
        "BƯỚC NHẢY VỌT THÔNG LƯỢNG (THROUGHPUT):\n• Baseline (tắt bảo vệ): 101.45 RPS (20.29 RPS/tenant)\n• Proposed (bật đầy đủ): 327.56 RPS (65.51 RPS/tenant)\n• Mức tăng trưởng: Tăng gấp 3.23 lần (+222.9%)\n• Số chu kỳ kiểm thử: Tăng từ 5.846 lên 19.736 iterations", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#15803D;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        945, 255, 375, 105, parent="frame_54"
    ))
    cells.append(create_cell(
        "pc_telemetry_cpu", 
        "BẰNG CHỨNG TELEMETRY CPU CONTAINER (N=17 mẫu):\n• kanban-api: Trung bình 95.0% | Đỉnh 127.9% (chạm trần 1.25 vCPU)\n• caddy: Đỉnh 17.1% | postgres: Đỉnh 17.2% | k6: Đỉnh 19.7%\n• TỔNG CÔNG SUẤT HOST CPU: 188% / 200% (94% CPU vật lý máy chủ)\n• HikariCP kết nối đỉnh: Giảm từ 25/25 xuống còn 4/25 kết nối (-84%)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        945, 375, 375, 120, parent="frame_54"
    ))
    cells.append(create_cell(
        "pc_insight", 
        "GIẢI MÃ BẢN CHẤT: Telemetry khẳng định p99 (~2.0s) giãn nhẹ là do máy chủ tiệm cận 94% công suất CPU vật lý, trong khi p50 và p95 giữ vững hoàn hảo.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#475569;strokeWidth=1;fontSize=10.5;fontStyle=1;align=center;", 
        945, 515, 375, 75, parent="frame_54"
    ))
    
    return '\n'.join(cells)

# ==============================================================================
# 5. HÌNH 5.5: VÒNG ĐỜI TÙY BIẾN ĐỘNG JSONB VÀ WIP STRICT (KB-4)
# ==============================================================================
def get_hinh_5_5_xml():
    cells = []
    
    cells.append(create_cell(
        "frame_55", 
        "HÌNH 5.5: QUY TRÌNH TÙY BIẾN CẤU HÌNH ĐỘNG VÀ KẾT QUẢ KIỂM CHỨNG THỰC NGHIỆM JSONB, WIP STRICT (KB-4)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1E3A8A;strokeWidth=2;fontSize=14;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        20, 20, 1360, 720
    ))
    
    # Panel a: 6-Step Dynamic Lifecycle
    cells.append(create_cell(
        "p55_a", 
        "Panel a: Chu trình 6 bước trong Vòng đời Cấu hình Động và Đồng bộ Bộ đệm Đa tầng", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#FAF5FF;strokeColor=#7E22CE;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        50, 75, 620, 620, parent="frame_55"
    ))
    steps = [
        ("Bước 1: Quản trị viên thay đổi cấu hình", "Thao tác trên Mặt phẳng Điều khiển (Control Plane), thay đổi chế độ WIP STRICT/WARN hoặc bổ sung trường dữ liệu mở rộng.", "#EDE9FE", 125),
        ("Bước 2: Ghi nhận an toàn vào CSDL Postgres", "Giao dịch commit an toàn vào bảng tenant_settings trong CSDL PostgreSQL 16 theo cơ chế bất đồng bộ khép kín.", "#EDE9FE", 205),
        ("Bước 3: Vô hiệu hóa đệm L1 & Bắn Redis Pub/Sub", "Instance API thực hiện vô hiệu hóa key cục bộ và phát thông điệp Pub/Sub qua kênh tenant:config:invalidate.", "#EDE9FE", 285),
        ("Bước 4: Lan truyền xóa đệm toàn cụm API", "Toàn bộ các API instances nhận thông điệp và xóa đệm L1 Caffeine trong thời gian cực nhanh: 2.45 ± 0.65 ms.", "#FEF08A", 365),
        ("Bước 5: Nạp lại đệm L1 Caffeine theo cơ chế Lazy", "Yêu cầu nghiệp vụ kế tiếp nạp cấu hình mới vào L1 chỉ mất 0.12 ms (nhanh hơn gấp 150 lần so với đọc DB vật lý 18.5 ms).", "#FEF08A", 445),
        ("Bước 6: Giao diện React & Backend áp dụng tức thời", "Xác thực tức thời quy tắc WIP và hiển thị chính xác các trường mở rộng JSONB động mà không cần biên dịch hay khởi động lại.", "#BBF7D0", 525)
    ]
    for stitle, sdesc, sfill, sy in steps:
        cells.append(create_cell(
            f"step_{sy}", 
            f"<b>{stitle}</b><br/>{sdesc}", 
            f"rounded=1;whiteSpace=wrap;html=1;fillColor={sfill};strokeColor=#7C3AED;strokeWidth=1.5;fontSize=10.5;align=left;spacingLeft=10;", 
            75, sy, 570, 65, parent="frame_55"
        ))
    cells.append(create_cell(
        "step_sum", 
        "Thời gian lan truyền Pub/Sub: 2.45 ± 0.65 ms | Nạp L1 Caffeine: 0.12 ms vs Đọc CSDL: 18.5 ms.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;strokeWidth=1.5;fontSize=11;fontStyle=1;align=center;", 
        75, 610, 570, 50, parent="frame_55"
    ))
    
    # Panel b: KB-4 Verification Results
    cells.append(create_cell(
        "p55_b", 
        "Panel b: Bằng chứng Thực nghiệm Kiểm chứng Khả năng Tùy biến Động (KB-4)", 
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F0FDFA;strokeColor=#0D9488;strokeWidth=1.5;fontSize=12;fontStyle=1;align=center;verticalAlign=top;startSize=35;", 
        700, 75, 630, 620, parent="frame_55"
    ))
    cells.append(create_cell(
        "res_get", 
        "1. TRUY XUẤT CẤU HÌNH KANBAN (GET /tenant-settings/kanban):\n• Tổng số lần kiểm tra: 19/19 lần thành công tuyệt đối (100% HTTP 200)\n• Phản ánh chính xác wipMode và danh mục fields tùy biến đã định nghĩa\n• Đọc từ L1 Caffeine: 0.12 ± 0.03 ms (nhanh gấp 150 lần truy vấn CSDL)", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#CCFBF1;strokeColor=#0F766E;strokeWidth=1.5;fontSize=11;align=left;spacingLeft=10;", 
        725, 125, 580, 85, parent="frame_55"
    ))
    cells.append(create_cell(
        "res_jsonb", 
        "2. ĐỘNG CƠ SIÊU DỮ LIỆU & TRƯỜNG MỞ RỘNG JSONB:\n• Thao tác: POST /boards/{id}/tasks kèm customData theo schema\n• t-acme ({story_points: 5, sprint: 'Sprint Load'}): 19/19 thành công 100% (HTTP 201 Created)\n• t-lotus ({channel: 'Web', budget_usd: 800}): 19/19 thành công 100% (HTTP 201 Created)\n• Trường lạ ngoài schema: Bị chặn đứng với HTTP 422 MetadataValidationException\n• Độ trễ thực thi trung bình: 22.30 ± 4.15 ms", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#CCFBF1;strokeColor=#0F766E;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        725, 230, 580, 125, parent="frame_55"
    ))
    cells.append(create_cell(
        "res_wip", 
        "3. THỰC THI QUY TẮC NGHIỆP VỤ ĐỘNG (WIP STRICT ENFORCEMENT):\n• Kịch bản: Di chuyển thẻ PATCH /tasks/{id}/position vào cột In Dev có limit = 2 (t-acme)\n• Lượt 1 & 2: Chấp thuận với HTTP 200 (đạt trần hạn mức limit = 2)\n• Lượt 3 đến 19: Chặn đứng 17/17 yêu cầu vi phạm với HTTP 422 Unprocessable Entity\n• Tỷ lệ thực thi đúng luật STRICT: 89.5% (17/19 mẫu chặn chính xác, 2/19 mẫu lấp đầy)\n• Độ trễ phản hồi: 12.15 ± 2.20 ms", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;strokeWidth=2;fontSize=11;align=left;spacingLeft=10;", 
        725, 375, 580, 130, parent="frame_55"
    ))
    cells.append(create_cell(
        "res_sum", 
        "KẾT LUẬN PANEL B: Động cơ tùy biến ba lớp vận hành hoàn hảo, cho phép chạy đồng thời các tổ chức có quy tắc trái ngược nhau trên cùng một phiên bản mã nguồn.", 
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;strokeWidth=1.5;fontSize=11;fontStyle=1;align=center;", 
        725, 530, 580, 60, parent="frame_55"
    ))
    
    return '\n'.join(cells)

# ==============================================================================
# MAIN GENERATION
# ==============================================================================
def main():
    out_dir = "diagrams/chapter5"
    os.makedirs(out_dir, exist_ok=True)
    
    diagrams = [
        ("hinh_5_1_pipeline_thuc_nghiem.drawio", "Hình 5.1 · Kiến trúc môi trường thực nghiệm và luồng thu thập số liệu tự động", get_hinh_5_1_xml()),
        ("hinh_5_2_ban_do_thiet_ke_kb1_kb4.drawio", "Hình 5.2 · Bản đồ thiết kế thực nghiệm và ánh xạ KB-1 đến KB-4", get_hinh_5_2_xml()),
        ("hinh_5_3_kiem_dinh_dinh_danh_csdl_rls.drawio", "Hình 5.3 · Kết quả kiểm định định danh, cô lập CSDL và chi phí RLS", get_hinh_5_3_xml()),
        ("hinh_5_4_do_tre_dieu_tiet_luu_luong.drawio", "Hình 5.4 · Kết quả kiểm định độ trễ phân tầng và điều tiết lưu lượng Aggressor", get_hinh_5_4_xml()),
        ("hinh_5_5_tuy_bien_dong_jsonb_wip.drawio", "Hình 5.5 · Quy trình tùy biến cấu hình động và kết quả kiểm chứng JSONB, WIP Strict", get_hinh_5_5_xml()),
    ]
    
    multi_list = []
    for fname, dname, xml_content in diagrams:
        file_path = os.path.join(out_dir, fname)
        full_xml = build_drawio_file(dname, xml_content)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_xml)
        print(f"[✓] Created drawio file: {file_path}")
        multi_list.append((dname, xml_content))
        
    # Also create the master multi-page drawio file
    master_path = os.path.join(out_dir, "Chuong_5_Tat_Ca_Cac_Hinh.drawio")
    master_xml = build_multi_diagram_drawio(multi_list)
    with open(master_path, "w", encoding="utf-8") as f:
        f.write(master_xml)
    print(f"[✓] Created master multi-diagram drawio file: {master_path}")

if __name__ == "__main__":
    main()
