# -*- coding: utf-8 -*-
"""
Script to generate MINIMALIST, CLEAN, ELEGANT .drawio XML files for Chapter 5 (Figures 5.1 to 5.5).
Design principles:
- Pastel palette: #EAF1F7 (Soft Blue), #EDF4F0 (Soft Green), #F4EBDD (Soft Cream), #F3F5F7 (Light Gray), #D8E0E7 (Border), #DCECE7 (Result Teal)
- Dark slate text: #2C3E50 or #334155, NO white text on dark background
- Thin borders (strokeWidth=1), rounded corners (arcSize=6 to 10)
- Minimalist text (40-50% reduction): keywords and bullet points only, 1 title + 2-3 short lines max
- Hierarchy: Titles 16-18px, Subheadings 13-14px, Content 11-12px
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

def build_drawio_file(diagram_name, cells_xml, width=1200, height=800):
    diag_id = f"diag_{abs(hash(diagram_name)) % 10000000}"
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-11-15T14:00:00.000Z" agent="Mozilla/5.0" version="21.0.0" type="device">
  <diagram id="{diag_id}" name="{escape(diagram_name)}">
    <mxGraphModel dx="1200" dy="750" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
{cells_xml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_multi_diagram_drawio(diagrams_list, width=1200, height=800):
    xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-11-15T14:00:00.000Z" agent="Mozilla/5.0" version="21.0.0" type="device">']
    for idx, (diag_name, cells_xml) in enumerate(diagrams_list):
        diag_id = f"diag_ch5_{idx+1}"
        xml_parts.append(f'''  <diagram id="{diag_id}" name="{escape(diag_name)}">
    <mxGraphModel dx="1200" dy="750" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">
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
# HÌNH 5.1: MÔI TRƯỜNG THỰC NGHIỆM VÀ PIPELINE (TỐI GIẢN)
# ==============================================================================
def get_hinh_5_1_xml():
    cells = []
    
    # Header Banner
    cells.append(create_cell(
        "top_banner",
        "MÔI TRƯỜNG THỰC NGHIỆM AWS EC2\nm7i-flex.large · 2 vCPU · 8 GiB RAM · Ubuntu 24.04 LTS · Docker Compose",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#EAF1F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=14;fontStyle=1;fontColor=#2C3E50;align=center;",
        40, 25, 1120, 60
    ))
    
    # 1. Left: k6 Workload
    cells.append(create_cell(
        "box_k6",
        "BỘ SINH TẢI\nk6 v0.50",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F3F5F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        40, 110, 310, 480
    ))
    cells.append(create_cell(
        "k6_vus",
        "Quy mô tải đồng thời\n80 Virtual Users (VUs)",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=12;fontStyle=1;fontColor=#2C3E50;align=center;",
        60, 160, 270, 55, parent="box_k6"
    ))
    cells.append(create_cell(
        "k6_tenants",
        "5 Nhóm thuê bao mô phỏng\n• t-acme: 15 VUs · 200 thẻ (WIP STRICT)\n• pool-demo: 15 VUs · 500 thẻ (WIP WARN)\n• t-lotus: 20 VUs · 1.000 thẻ (JSONB)\n• t-finance: 10 VUs · 300 thẻ (WIP STRICT)\n• t-aggressor: 20 VUs · Bão tải đột biến",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#334155;align=left;spacingLeft=12;lineHeight=140%;",
        60, 230, 270, 155, parent="box_k6"
    ))
    cells.append(create_cell(
        "k6_cycle",
        "Chu kỳ đo kiểm 3 pha\n30s Warmup → 60s Đo → 25s Cooldown",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#EDF4F0;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontStyle=0;fontColor=#2C3E50;align=center;",
        60, 400, 270, 50, parent="box_k6"
    ))
    cells.append(create_cell(
        "k6_sub",
        "Mô phỏng bất đối xứng về quy mô và hành vi",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        60, 455, 270, 25, parent="box_k6"
    ))

    # 2. Center: Application Cluster
    cells.append(create_cell(
        "box_app",
        "ỨNG DỤNG ĐA THUÊ BAO\nDocker Compose Cluster",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F3F5F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        390, 110, 420, 480
    ))
    apps = [
        ("app_web", "Web / Reverse Proxy (Caddy)\nĐịnh tuyến yêu cầu · Phục vụ tĩnh React 18", "#FFFFFF", 160, 60),
        ("app_api", "API Service (Spring Boot 3 + Java 21)\nXác thực JWT · ThreadLocal · Bộ đệm L1 Caffeine · Metadata Engine", "#EAF1F7", 235, 75),
        ("app_redis", "Redis 7\nBộ đệm L2 · Token Bucket (Rate Limit) · Redis Pub/Sub", "#FFFFFF", 325, 65),
        ("app_pg", "PostgreSQL 16\nShared-Schema · RLS Fail-Closed · SET LOCAL app.tenant_id", "#EDF4F0", 405, 70),
    ]
    for aid, alabel, afill, ay, ah in apps:
        cells.append(create_cell(
            aid, alabel,
            f"rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor={afill};strokeColor=#D8E0E7;strokeWidth=1;fontSize=11.5;fontColor=#2C3E50;align=left;spacingLeft=15;",
            415, ay, 370, ah, parent="box_app"
        ))
    cells.append(create_cell(
        "app_sub",
        "Cô lập tài nguyên theo cgroups cho từng container",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        415, 485, 370, 25, parent="box_app"
    ))

    # 3. Right: Telemetry & Measurement
    cells.append(create_cell(
        "box_tel",
        "THU THẬP SỐ LIỆU\nPipeline Giám sát",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F3F5F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        850, 110, 310, 480
    ))
    tels = [
        ("tel_prom", "Prometheus\nScrape Micrometer, HikariCP pool, JVM", 160),
        ("tel_cad", "cAdvisor & Collector\nLấy mẫu CPU, RAM container mỗi 5s → telemetry.csv", 245),
        ("tel_k6", "k6 Summary\nPhân vị p50, p95, p99 → proposed_summary.json", 330),
        ("tel_out", "Kết quả Thực nghiệm\nĐối chiếu Baseline vs Proposed", 415),
    ]
    for tid, tlabel, ty in tels:
        tfill = "#DCECE7" if tid == "tel_out" else "#FFFFFF"
        cells.append(create_cell(
            tid, tlabel,
            f"rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor={tfill};strokeColor=#D8E0E7;strokeWidth=1;fontSize=11.5;fontColor=#2C3E50;align=left;spacingLeft=12;",
            870, ty, 270, 65, parent="box_tel"
        ))

    # Bottom Flow Legend
    cells.append(create_cell(
        "bot_legend",
        "Luồng request HTTP/REST (80 VUs)  ────────▶  Ứng dụng đa thuê bao  ────────▶  Luồng giám sát Telemetry & Kết quả",
        "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#475569;align=center;",
        40, 610, 1120, 40
    ))

    # Connectors
    cells.append(create_cell("e1", "", "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#94A3B8;strokeWidth=1.5;", 0, 0, 0, 0, as_edge=True, source="box_k6", target="box_app"))
    cells.append(create_cell("e2", "", "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#94A3B8;strokeWidth=1.5;", 0, 0, 0, 0, as_edge=True, source="box_app", target="box_tel"))

    return '\n'.join(cells)

# ==============================================================================
# HÌNH 5.2: BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM KB-1 ĐẾN KB-4 (TỐI GIẢN)
# ==============================================================================
def get_hinh_5_2_xml():
    cells = []
    
    # Title
    cells.append(create_cell(
        "top_52",
        "BẢN ĐỒ THIẾT KẾ THỰC NGHIỆM VÀ ÁNH XẠ CÁC KỊCH BẢN KIỂM ĐỊNH",
        "text;html=1;fontSize=15;fontStyle=1;fontColor=#2C3E50;align=center;",
        40, 20, 1120, 30
    ))

    cards = [
        {
            "id": "kb1", "title": "KB-1 · Định danh",
            "p1": "Nội dung kiểm thử\nJWT hỏng · Host lệch · Hồ luồng Tomcat",
            "p2": "Cơ chế chính\nTenantContextFilter · ThreadLocal try/finally",
            "p3": "Kết quả quan sát\nHTTP 401 / 403 · Nhất quán MDC (0 rò rỉ)",
            "bg": "#EAF1F7", "x": 40
        },
        {
            "id": "kb2", "title": "KB-2 · Cô lập dữ liệu",
            "p1": "Nội dung kiểm thử\nSELECT bỏ WHERE · IDOR UUID · Bỏ SET LOCAL",
            "p2": "Cơ chế chính\nPostgreSQL FORCE RLS · Fail-Closed",
            "p3": "Kết quả quan sát\n0 bản ghi rò rỉ · Phụ trội RLS vi mô (+0.45 ms)",
            "bg": "#EDF4F0", "x": 330
        },
        {
            "id": "kb3", "title": "KB-3 · Hiệu năng",
            "p1": "Nội dung kiểm thử\nAggressor phát tải bão (20 VUs) vs Tenant thường",
            "p2": "Cơ chế chính\nRedis Token Bucket (Rate Limit) · Đệm 2 tầng",
            "p3": "Kết quả quan sát\nĐộ trễ p50, p95 · Chặn 16.423 req HTTP 429",
            "bg": "#F4EBDD", "x": 620
        },
        {
            "id": "kb4", "title": "KB-4 · Tùy biến",
            "p1": "Nội dung kiểm thử\nCấu hình tenant · Custom fields · WIP STRICT",
            "p2": "Cơ chế chính\nMetadata Engine JSONB · Redis Pub/Sub",
            "p3": "Kết quả quan sát\n19/19 JSONB 201 · Thực thi WIP 422 (89.5%)",
            "bg": "#F3F5F7", "x": 910
        }
    ]

    for c in cards:
        cx = c["x"]
        # Outer Card
        cells.append(create_cell(
            c["id"],
            f"{c['title']}",
            f"swimlane;whiteSpace=wrap;html=1;fillColor={c['bg']};strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=40;arcSize=8;",
            cx, 70, 250, 460
        ))
        # 3 Sub-blocks
        parts = [("part1", c["p1"], 125, "#FFFFFF"), ("part2", c["p2"], 235, "#FFFFFF"), ("part3", c["p3"], 345, "#DCECE7")]
        for pid, ptxt, py, pcol in parts:
            cells.append(create_cell(
                f"{c['id']}_{pid}",
                ptxt,
                f"rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor={pcol};strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#2C3E50;align=left;spacingLeft=10;lineHeight=140%;",
                cx + 15, py, 220, 95, parent=c["id"]
            ))

    # Bottom Mapping Row
    cells.append(create_cell(
        "bot_map",
        "Ánh xạ Yêu cầu Phi chức năng (Chương 4):\nKB-1  ──▶  NFR-01 (Định danh)    |    KB-2  ──▶  NFR-02, NFR-03 (Cô lập & Chi phí RLS)    |    KB-3  ──▶  NFR-04 (SLA < 500 ms)    |    KB-4  ──▶  NFR-05, NFR-06 (Tùy biến & Đệm)",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontStyle=1;fontColor=#334155;align=center;",
        40, 560, 1120, 50
    ))

    return '\n'.join(cells)

# ==============================================================================
# HÌNH 5.3: KIỂM ĐỊNH ĐỊNH DANH VÀ CÔ LẬP DỮ LIỆU (BIG NUMBERS + BAR)
# ==============================================================================
def get_hinh_5_3_xml():
    cells = []
    
    # Title
    cells.append(create_cell(
        "top_53",
        "KẾT QUẢ KIỂM ĐỊNH ĐỊNH DANH (KB-1), CÔ LẬP CSDL (KB-2) VÀ CHI PHÍ RLS",
        "text;html=1;fontSize=15;fontStyle=1;fontColor=#2C3E50;align=center;",
        40, 20, 1120, 30
    ))

    # Panel a: Identity & Context
    cells.append(create_cell(
        "p_a",
        "(a) Định danh & Ngữ cảnh (KB-1)",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EAF1F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        40, 70, 350, 480
    ))
    a_items = [
        ("a1", "500 / 500", "Yêu cầu JWT lỗi → HTTP 401\nChặn đứng ngay tại cổng biên", 120),
        ("a2", "200 / 200", "Yêu cầu Host lệch → HTTP 403\nTừ chối truy cập sai định danh", 230),
        ("a3", "1.500", "Yêu cầu luân chuyển hồ luồng Tomcat\nKhớp 100% X-Tenant-ID & MDC (0 rò rỉ)", 340),
    ]
    for iid, big, sub, iy in a_items:
        cells.append(create_cell(
            iid,
            f"<b><font style='font-size: 20px;' color='#1E3A8A'>{big}</font></b><br/><font color='#475569'>{sub}</font>",
            "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;align=center;lineHeight=130%;",
            60, iy, 310, 95, parent="p_a"
        ))
    cells.append(create_cell("a_foot", "Xác thực biên và giải phóng ThreadLocal triệt để", "text;html=1;fontSize=10;fontColor=#64748B;align=center;", 60, 450, 310, 25, parent="p_a"))

    # Panel b: Data Isolation Fail-Closed
    cells.append(create_cell(
        "p_b",
        "(b) Rào chắn CSDL Fail-Closed (KB-2)",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EDF4F0;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        425, 70, 350, 480
    ))
    b_items = [
        ("b1", "0", "SELECT bỏ WHERE bị rò rỉ (200 mẫu)\nFORCE RLS tự động chèn bộ lọc", 120),
        ("b2", "300 / 300", "Mẫu thử IDOR UUID bị chặn\nTrả về HTTP 404 / 403", 230),
        ("b3", "0 dòng", "Khi thiếu SET LOCAL (100 mẫu)\nCơ chế Fail-Closed trả về rỗng", 340),
    ]
    for iid, big, sub, iy in b_items:
        cells.append(create_cell(
            iid,
            f"<b><font style='font-size: 20px;' color='#0D9488'>{big}</font></b><br/><font color='#475569'>{sub}</font>",
            "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;align=center;lineHeight=130%;",
            445, iy, 310, 95, parent="p_b"
        ))
    cells.append(create_cell("b_foot", "PostgreSQL 16 bảo vệ an toàn ngay tại nhân CSDL", "text;html=1;fontSize=10;fontColor=#64748B;align=center;", 445, 450, 310, 25, parent="p_b"))

    # Panel c: RLS Microbenchmark Comparison Bars
    cells.append(create_cell(
        "p_c",
        "(c) Chi phí Vi mô Thực thi RLS",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F3F5F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        810, 70, 350, 480
    ))
    cells.append(create_cell(
        "c_title", "Độ trễ truy vấn trung bình (N=500 mẫu)",
        "text;html=1;fontSize=11;fontStyle=1;fontColor=#334155;align=center;",
        830, 120, 310, 25, parent="p_c"
    ))
    # Bar 1: Without RLS
    cells.append(create_cell(
        "bar_no_rls",
        "Không RLS (WHERE thủ công):  1,25 ms",
        "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#E2E8F0;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#334155;align=left;spacingLeft=15;",
        835, 160, 230, 45, parent="p_c"
    ))
    # Bar 2: With RLS
    cells.append(create_cell(
        "bar_rls",
        "Có RLS (SET LOCAL + FORCE RLS):  1,70 ms",
        "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#DCECE7;strokeColor=#0D9488;strokeWidth=1;fontSize=11;fontStyle=1;fontColor=#0F766E;align=left;spacingLeft=15;",
        835, 225, 290, 45, parent="p_c"
    ))
    # Delta Badge
    cells.append(create_cell(
        "c_delta",
        "<b><font style='font-size: 18px;' color='#B45309'>+0,45 ms</font></b><br/>Phụ trội độ trễ vi mô (~36%)<br/><font color='#64748B'>Tối ưu bởi chỉ mục B-Tree (tenant_id)</font>",
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;align=center;lineHeight=140%;",
        835, 295, 300, 85, parent="p_c"
    ))
    cells.append(create_cell(
        "c_note",
        "Số đo vi mô trên tập mẫu thử nghiệm, cần đối chiếu với ngưỡng NFR về hiệu năng tương ứng.",
        "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=10;fontColor=#64748B;align=center;spacing=8;",
        835, 400, 300, 55, parent="p_c"
    ))

    return '\n'.join(cells)

# ==============================================================================
# HÌNH 5.4: ĐỘ TRỄ VÀ ĐIỀU TIẾT LƯU LƯỢNG (BIỂU ĐỒ THANH NGANG)
# ==============================================================================
def get_hinh_5_4_xml():
    cells = []
    
    # Title
    cells.append(create_cell(
        "top_54",
        "KẾT QUẢ ĐỐI CHIẾU ĐỘ TRỄ VÀ ĐIỀU TIẾT LƯU LƯỢNG THUÊ BAO GÂY NHIỄU (KB-3)",
        "text;html=1;fontSize=15;fontStyle=1;fontColor=#2C3E50;align=center;",
        40, 20, 1120, 30
    ))

    # Panel a: p50 comparison bars
    cells.append(create_cell(
        "p54_a",
        "(a) Độ trễ trung vị p50 (ms)\nSo sánh 4 tenant thông thường",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EAF1F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=12;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=40;arcSize=8;",
        40, 65, 360, 480
    ))
    tenants_p50 = [
        ("Acme (Nhỏ, 15 VUs)", "233.3 ms", "26.9 ms", 120),
        ("Pool (Vừa, 15 VUs)", "188.0 ms", "24.0 ms", 205),
        ("Lotus (Lớn, 20 VUs)", "189.3 ms", "22.9 ms", 290),
        ("Finance (Chuẩn, 10 VUs)", "211.3 ms", "25.4 ms", 375),
    ]
    for tname, b_val, p_val, ty in tenants_p50:
        cells.append(create_cell(
            f"p50_{ty}",
            f"<b>{tname}</b><br/>• Baseline: {b_val}  ──▶  <b>Proposed: <font color='#0D9488'>{p_val}</font></b>",
            "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#334155;align=left;spacingLeft=12;lineHeight=130%;",
            55, ty, 330, 65, parent="p54_a"
        ))
    cells.append(create_cell(
        "p50_foot",
        "Độ trễ p50 giảm từ ~188–233 ms xuống còn 22.9–26.9 ms",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        55, 455, 330, 25, parent="p54_a"
    ))

    # Panel b: p95 comparison bars
    cells.append(create_cell(
        "p54_b",
        "(b) Độ trễ đuôi p95 (ms)\nThang đo riêng · Ngưỡng tham chiếu 500 ms",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EDF4F0;strokeColor=#D8E0E7;strokeWidth=1;fontSize=12;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=40;arcSize=8;",
        420, 65, 360, 480
    ))
    tenants_p95 = [
        ("Acme (Nhỏ, 15 VUs)", "1526.5 ms", "253.7 ms", 120),
        ("Pool (Vừa, 15 VUs)", "1166.0 ms", "253.9 ms", 205),
        ("Lotus (Lớn, 20 VUs)", "1257.2 ms", "242.2 ms", 290),
        ("Finance (Chuẩn, 10 VUs)", "1291.3 ms", "276.8 ms", 375),
    ]
    for tname, b_val, p_val, ty in tenants_p95:
        cells.append(create_cell(
            f"p95_{ty}",
            f"<b>{tname}</b><br/>• Baseline: {b_val}  ──▶  <b>Proposed: <font color='#0D9488'>{p_val}</font></b>",
            "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;fontColor=#334155;align=left;spacingLeft=12;lineHeight=130%;",
            435, ty, 330, 65, parent="p54_b"
        ))
    cells.append(create_cell(
        "p95_foot",
        "Cả 4 tenant đều nằm dưới ngưỡng tham chiếu p95 < 500 ms",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        435, 455, 330, 25, parent="p54_b"
    ))

    # Panel c: Aggressor Rate Limiting Big Numbers
    cells.append(create_cell(
        "p54_c",
        "(c) Điều tiết Thuê bao Gây nhiễu\nKết quả khống chế lưu lượng vượt ngưỡng",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#F4EBDD;strokeColor=#D8E0E7;strokeWidth=1;fontSize=12;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=40;arcSize=8;",
        800, 65, 360, 480
    ))
    c_boxes = [
        ("c1", "16.423", "Yêu cầu HTTP 429\nBị chặn đứng ngay tại Middleware", 120, "#FFFFFF"),
        ("c2", "92,66%", "Tỷ lệ lưu lượng Aggressor bị cắt\n(1.300 yêu cầu hợp lệ lọt qua)", 210, "#FFFFFF"),
        ("c3", "2.613 / 2.613", "Yêu cầu của tenant thông thường\nThành công 100% (0 lỗi dịch vụ)", 300, "#DCECE7"),
    ]
    for cid, big, sub, cy, cbg in c_boxes:
        cells.append(create_cell(
            cid,
            f"<b><font style='font-size: 19px;' color='#B45309'>{big}</font></b><br/><font color='#475569'>{sub}</font>",
            f"rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor={cbg};strokeColor=#D8E0E7;strokeWidth=1;fontSize=11;align=center;lineHeight=130%;",
            820, cy, 320, 75, parent="p54_c"
        ))
    cells.append(create_cell(
        "c_foot",
        "Độ trễ p99 nằm trong khoảng ~1.99–2.45s ở phân vị cực đoan",
        "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=10;fontColor=#64748B;align=center;spacing=6;",
        820, 395, 320, 45, parent="p54_c"
    ))

    return '\n'.join(cells)

# ==============================================================================
# HÌNH 5.5: TÙY BIẾN ĐỘNG JSONB VÀ WIP (3 BƯỚC + KẾT QUẢ)
# ==============================================================================
def get_hinh_5_5_xml():
    cells = []
    
    # Title
    cells.append(create_cell(
        "top_55",
        "QUY TRÌNH KIỂM CHỨNG TÙY BIẾN CẤU HÌNH ĐỘNG VÀ KẾT QUẢ (KB-4)",
        "text;html=1;fontSize=15;fontStyle=1;fontColor=#2C3E50;align=center;",
        40, 20, 1120, 30
    ))

    # Left: 3-Step Verification Process
    cells.append(create_cell(
        "p55_left",
        "Quy trình Kiểm chứng KB-4",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EAF1F7;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        60, 65, 520, 480
    ))
    steps = [
        ("s1", "01", "Cấu hình tenant", "Thiết lập quy tắc WIP STRICT/WARN và định nghĩa trường mở rộng (custom fields)", 120),
        ("s2", "02", "Kiểm tra API", "Thực thi GET Settings truy xuất cấu hình và POST Custom Data theo schema", 230),
        ("s3", "03", "Áp dụng WIP", "Kiểm tra giới hạn số thẻ trong cột → Chấp nhận (200) hoặc Từ chối (422)", 340),
    ]
    for sid, num, stitle, sdesc, sy in steps:
        cells.append(create_cell(
            sid,
            f"<b><font style='font-size: 16px;' color='#1E3A8A'>{num}</font> · {stitle}</b><br/><font color='#475569'>{sdesc}</font>",
            "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11.5;align=left;spacingLeft=15;lineHeight=135%;",
            85, sy, 470, 85, parent="p55_left"
        ))
    cells.append(create_cell(
        "s_note",
        "Kiểm chứng thay đổi cấu hình lúc chạy mà không cần sửa mã nguồn",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        85, 450, 470, 25, parent="p55_left"
    ))

    # Right: Verification Results (Big Numbers)
    cells.append(create_cell(
        "p55_right",
        "Kết quả Kiểm thử Thực nghiệm",
        "swimlane;whiteSpace=wrap;html=1;fillColor=#EDF4F0;strokeColor=#D8E0E7;strokeWidth=1;fontSize=13;fontStyle=1;fontColor=#2C3E50;align=center;verticalAlign=top;startSize=35;arcSize=8;",
        620, 65, 520, 480
    ))
    res_items = [
        ("r1", "19 / 19", "GET Settings (HTTP 200)\nTruy xuất cấu hình Kanban thành công 100%", 120),
        ("r2", "19 / 19", "POST JSONB (HTTP 201)\nTạo thẻ kèm trường story_points, sprint hợp lệ", 230),
        ("r3", "2 + 17", "WIP STRICT (HTTP 200 / 422)\n2 thao tác đầu chấp nhận (đầy limit=2) · 17 thao tác sau bị từ chối 422", 340),
    ]
    for rid, big, sub, ry in res_items:
        cells.append(create_cell(
            rid,
            f"<b><font style='font-size: 20px;' color='#0D9488'>{big}</font></b><br/><font color='#334155'>{sub}</font>",
            "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D8E0E7;strokeWidth=1;fontSize=11.5;align=center;lineHeight=135%;",
            645, ry, 470, 85, parent="p55_right"
        ))
    cells.append(create_cell(
        "r_note",
        "Xác nhận cơ chế kiểm tra siêu dữ liệu và thực thi quy tắc WIP đúng thiết kế",
        "text;html=1;fontSize=10;fontColor=#64748B;align=center;",
        645, 450, 470, 25, parent="p55_right"
    ))

    return '\n'.join(cells)

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
def main():
    out_dir = "diagrams/chapter5"
    os.makedirs(out_dir, exist_ok=True)
    
    diagrams = [
        ("hinh_5_1_pipeline_thuc_nghiem.drawio", "Hình 5.1 · Kiến trúc môi trường thực nghiệm và hệ thống thu thập số liệu", get_hinh_5_1_xml()),
        ("hinh_5_2_ban_do_thiet_ke_kb1_kb4.drawio", "Hình 5.2 · Bản đồ thiết kế thực nghiệm và ánh xạ KB-1 đến KB-4", get_hinh_5_2_xml()),
        ("hinh_5_3_kiem_dinh_dinh_danh_csdl_rls.drawio", "Hình 5.3 · Kết quả kiểm định định danh, cô lập CSDL và chi phí RLS", get_hinh_5_3_xml()),
        ("hinh_5_4_do_tre_dieu_tiet_luu_luong.drawio", "Hình 5.4 · Kết quả kiểm định độ trễ và điều tiết lưu lượng thuê bao gây nhiễu", get_hinh_5_4_xml()),
        ("hinh_5_5_tuy_bien_dong_jsonb_wip.drawio", "Hình 5.5 · Quy trình tùy biến cấu hình động và kết quả kiểm chứng JSONB, WIP", get_hinh_5_5_xml()),
    ]
    
    multi_list = []
    for fname, dname, xml_content in diagrams:
        file_path = os.path.join(out_dir, fname)
        full_xml = build_drawio_file(dname, xml_content)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_xml)
        print(f"[✓] Created clean drawio: {file_path}")
        multi_list.append((dname, xml_content))
        
    master_path = os.path.join(out_dir, "Chuong_5_Tat_Ca_Cac_Hinh.drawio")
    master_xml = build_multi_diagram_drawio(multi_list)
    with open(master_path, "w", encoding="utf-8") as f:
        f.write(master_xml)
    print(f"[✓] Created clean master multi-diagram drawio: {master_path}")

if __name__ == "__main__":
    main()
