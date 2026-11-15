import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

def build_chapter_5_content():
    """
    Returns the structured sections and elements for Chapter 5 with 6 figures and NO tables.
    """
    content = []
    
    # Heading 1
    content.append({
        'type': 'h1',
        'text': 'CHƯƠNG 5: THIẾT LẬP THỰC NGHIỆM, KẾT QUẢ KIỂM ĐỊNH VÀ KẾT LUẬN'
    })
    
    # Intro
    content.append({
        'type': 'p',
        'text': (
            "Chương 5 tiến hành kiểm chứng thực nghiệm các quyết định kiến trúc và giải pháp kỹ thuật đã đề xuất "
            "thông qua bốn nhóm kịch bản đo kiểm KB-1 đến KB-4 trên môi trường cô lập tài nguyên. Mục tiêu là kiểm chứng "
            "mức độ thỏa mãn của sáu yêu cầu phi chức năng NFR-01 đến NFR-06, phân tích nguyên nhân kỹ thuật đằng sau các "
            "kết quả đo lường, và đối chiếu khép kín vòng lặp để giải quyết bảy thách thức thiết kế cốt lõi đã đặt ra từ Chương 1. "
            "Toàn bộ kết quả thực nghiệm được trình bày qua bộ 6 hình minh họa khoa học, phản ánh trực quan chuỗi logic: "
            "Thiết lập môi trường → Can thiệp kỹ thuật → Đo đạc định lượng → Kết luận bản chất hệ thống."
        )
    })
    
    # 5.1
    content.append({
        'type': 'h2',
        'text': '5.1. Thiết lập Môi trường Thực nghiệm, Dữ liệu Phân tầng và Khung Đo lường'
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Để đảm bảo tính khách quan và khả năng tái lập kết quả, toàn bộ quá trình đo kiểm định lượng được triển khai "
            "trên hạ tầng máy chủ điện toán đám mây AWS EC2 với cấu hình chuẩn hóa, kết hợp cùng hệ thống thu thập số liệu tự động. "
            "Cấu trúc môi trường thực thi và đường ống xử lý dữ liệu đo lường được thể hiện tại Hình 5.1."
        )
    })
    
    # Hình 5.1
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_1_pipeline_thuc_nghiem.png',
        'width': 6.2,
        'caption': (
            "Hình 5.1: Sơ đồ kiến trúc môi trường thực nghiệm và pipeline thu thập số liệu tự động.\n"
            "(Hạ tầng: AWS EC2 m7i-flex.large, 2 vCPU, 8 GiB RAM, OS Ubuntu 24.04 LTS; Tài nguyên ghim cứng qua Docker Compose: "
            "kanban-api 1.25 vCPU / 2.560 MB RAM / HikariCP max 25, postgres-db 0.50 vCPU / 1.536 MB RAM, redis-cache 0.25 vCPU / 512 MB RAM, "
            "kanban-web 0.25 vCPU / 256 MB RAM; Tải sinh bởi k6 v0.50 gồm 80 VUs trên 5 nhóm thuê bao; Quy trình đo chuẩn: 30s warmup, 60s đo chính thức, "
            "25s cooldown, số lượt lặp n=5; Giám sát: Prometheus Scrape Actuator & cAdvisor; Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Như thể hiện trên Hình 5.1, môi trường thực nghiệm được kiểm soát nghiêm ngặt về mặt tài nguyên nhằm phản ánh đúng "
            "hiện tượng tranh chấp trong mô hình chia sẻ toàn phần (Pool Model). Máy chủ máy ảo EC2 phân bổ tài nguyên tĩnh cho từng "
            "thành phần qua cgroups của Docker. Bộ sinh tải k6 mô phỏng hành vi truy cập đồng thời của 80 người dùng thuộc 5 phân nhóm thuê bao "
            "có quy mô dữ liệu và chính sách hoạt động bất đối xứng: nhóm Nhỏ (t-acme, 15 VUs, luật STRICT, 200 thẻ), "
            "nhóm Vừa (pool-demo, 15 VUs, luật WARN, 500 thẻ), nhóm Lớn (t-lotus, 20 VUs, luật WARN kèm dữ liệu mở rộng JSONB, 1.000 thẻ), "
            "nhóm Chuẩn (t-finance, 10 VUs, luật STRICT, 300 thẻ), và nhóm Thuê bao Gây nhiễu đối chứng (t-aggressor, 20 VUs phát tải đột biến "
            "dồn dập 1.800–3.000 req/phút không thời gian trễ). "
            "Quy trình thực nghiệm tuân thủ nghiêm ngặt chu kỳ ba pha: 30 giây làm nóng (warmup) để JIT compiler tối ưu hóa bytecode và làm ấm bộ đệm; "
            "60 giây thu thập dữ liệu chính thức; và 25 giây làm sạch đệm (cooldown) giải phóng kết nối giữa n = 5 lần lặp độc lập."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Thay vì sử dụng các bảng mô tả tĩnh, nghiên cứu hệ thống hóa toàn bộ phương pháp luận và kế hoạch kiểm định thông qua "
            "Bản đồ thiết kế thực nghiệm đa chiều tại Hình 5.2. Bản đồ phân tách rõ ràng mục tiêu cốt lõi, kịch bản tiêm lỗi, "
            "cơ chế kiểm soát kỹ thuật và chỉ số đo lường cho từng kịch bản KB-1 đến KB-4, tạo khung tham chiếu xuyên suốt cho các phân tích tiếp theo."
        )
    })
    
    # Hình 5.2
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_2_thiet_ke_kb1_kb4.png',
        'width': 6.2,
        'caption': (
            "Hình 5.2: Bản đồ thiết kế thực nghiệm đa chiều từ Kịch bản KB-1 đến KB-4.\n"
            "(Thiết kế 4 nhánh đối ứng toàn diện 4 Khía cạnh Kỹ thuật K1–K4 và 6 Yêu cầu Phi chức năng NFR-01 đến NFR-06; "
            "Cấu trúc logic chuẩn tắc: Mục tiêu cốt lõi → Kịch bản thử nghiệm / Tiêm lỗi → Cơ chế kiểm soát kỹ thuật → Kết quả đạt được; "
            "Thay thế Bảng danh mục thực nghiệm truyền thống; Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    # 5.2
    content.append({
        'type': 'h2',
        'text': '5.2. Kết quả Kiểm định Toàn vẹn Định danh và Rào chắn Cơ sở Dữ liệu (KB-1 & KB-2)'
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Để kiểm chứng năng lực cô lập ở tầng biên ứng dụng (K1) và chiều sâu cơ sở dữ liệu (K2), nghiên cứu đã thực hiện "
            "chuỗi phép thử tiêm lỗi giả lập tấn công và đo kiểm vi mô chi phí vận hành. "
            "Toàn bộ bằng chứng định lượng được tổng hợp chi tiết tại Hình 5.3."
        )
    })
    
    # Hình 5.3
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_3_bang_chung_co_lap_k1_k2.png',
        'width': 6.0,
        'caption': (
            "Hình 5.3: Bằng chứng thực nghiệm cô lập định danh (KB-1), rào chắn CSDL Fail-Closed (KB-2) và vi mô chi phí RLS.\n"
            "(Panel a: Kiểm định ranh giới ngữ cảnh luồng với 500 mẫu JWT lỗi, 200 mẫu Host lệch, 1.500 req tái sử dụng hồ luồng Tomcat; "
            "Panel b: Kiểm định rào chắn CSDL với 200 truy vấn SELECT cố tình bỏ WHERE, 300 mẫu IDOR đoán UUID thẻ chéo thuê bao, "
            "100 truy vấn thiếu SET LOCAL; Panel c: Đo kiểm vi mô chi phí độ trễ kích hoạt RLS trên tập 500 truy vấn mẫu; "
            "Workload: 80 VUs; Đơn vị: số mẫu và mili-giây (ms); Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Phân tích chuyên sâu từ bằng chứng thực nghiệm tại Hình 5.3 xác nhận ba phát hiện kỹ thuật quan trọng:\n"
            "1. Ranh giới ngữ cảnh luồng tuyệt đối an toàn (Hình 5.3a): Toàn bộ 500/500 yêu cầu mang token JWT thiếu claim tenant_id "
            "hoặc bị sửa đổi chữ ký số đều bị JwtTenantFilter chặn đứng ngay tại cổng vào với mã HTTP 401. Đồng thời, 200/200 yêu cầu "
            "có tiêu đề Host sai lệch với claim định danh trong token bị từ chối với HTTP 403. Dưới áp lực tải đồng thời 1.500 yêu cầu luân chuyển "
            "liên tục trên hồ luồng dùng chung Apache Tomcat (60 luồng), khối try ... finally đảm bảo giải phóng ThreadLocal hoàn toàn, "
            "đạt tỷ lệ khớp 100% giữa tenant_id yêu cầu, tiêu đề phản hồi X-Tenant-ID và nhãn chẩn đoán nhật ký MDC, loại trừ 100% nguy cơ nhiễm bẩn ngữ cảnh chéo.\n"
            "2. Cơ chế phòng thủ chiều sâu Fail-Closed của CSDL (Hình 5.3b): Khi tiêm lỗi câu lệnh SELECT * FROM cards cố tình bỏ sót hoàn toàn "
            "mệnh đề lọc WHERE tenant_id (200 mẫu), chính sách FORCE ROW LEVEL SECURITY tại nhân PostgreSQL 16 đã tự động chèn bộ lọc tenant_id = current_setting(...) "
            "khiến không có bất kỳ bản ghi nào của thuê bao khác bị rò rỉ (0 leak). Tương tự, 300 lần thử nghiệm tấn công trực tiếp bằng cách đoán mã UUID "
            "thuộc quyền sở hữu của thuê bao khác (IDOR) đều bị vô hiệu hóa (trả về 404 Not Found hoặc 403 Forbidden). Đặc biệt, khi thực thi 100 truy vấn "
            "trên kết nối HikariCP bị cố tình bỏ qua lệnh tiêm ngữ cảnh SET LOCAL, hệ thống kích hoạt cơ chế Đóng an toàn mặc định (Fail-Closed), "
            "trả về tập kết quả rỗng (0 dòng), ngăn chặn hoàn toàn rủi ro rò rỉ dữ liệu khi phát sinh lỗi lập trình ở tầng ứng dụng.\n"
            "3. Chi phí độ trễ vi mô của rào chắn CSDL (Hình 5.3c): Đo kiểm vi mô trên 500 truy vấn đối chứng cho thấy việc kích hoạt đầy đủ "
            "hai lớp SET LOCAL + FORCE RLS chỉ làm độ trễ thực thi tăng thêm +0.45 ms (từ 1.25 ± 0.32 ms lên 1.70 ± 0.41 ms, mức tăng ~36% trong microbenchmark). "
            "Mức tăng vi mô này hoàn toàn không trở thành nút thắt cổ chai khi vận hành toàn hệ thống bởi vì biến phiên được gán trực tiếp trong bộ nhớ phiên "
            "kết nối và điều kiện RLS được tối ưu hóa trực tiếp trên chỉ mục tổ hợp B-Tree (tenant_id, ...)."
        )
    })
    
    # 5.3
    content.append({
        'type': 'h2',
        'text': '5.3. Kết quả Kiểm định Hiệu năng, Kháng Láng giềng Ồn ào và Vòng đời Tùy biến (KB-3 & KB-4)'
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Thách thức lớn nhất trong kiến trúc Pool đa thuê bao là hiện tượng 'Hàng xóm ồn ào' (Noisy Neighbor), khi lưu lượng đột biến "
            "từ một khách hàng làm suy giảm nghiêm trọng chất lượng dịch vụ của các khách hàng khác cùng chia sẻ tài nguyên. "
            "Để đánh giá toàn diện giải pháp đề xuất, nghiên cứu đã tiến hành đo đạc độ trễ phân tầng theo từng thuê bao (Hình 5.4) "
            "và thực hiện phân tích đối sánh bóc tách thành phần (Ablation Study) giữa 4 cấu hình kiểm soát tài nguyên (Hình 5.5)."
        )
    })
    
    # Hình 5.4
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_4_noisy_neighbor_latency.png',
        'width': 6.2,
        'caption': (
            "Hình 5.4: Phân tích độ trễ phân tầng theo nhóm thuê bao dưới tác động của Hàng xóm Ồn ào (KB-3).\n"
            "(Đối chiếu trực diện giữa Cấu hình Cơ sở [Tắt Cache & Rate Limit] và Cấu hình Đề xuất [Bật Cache 2 tầng & Rate Limit]; "
            "Workload: 80 VUs dồn dập, Aggressor phát lưu lượng đột biến ~1.800–3.000 req/phút; Đơn vị đo: mili-giây [ms]; "
            "Panel a: Độ trễ trung vị p50; Panel b: Độ trễ phân vị đuôi p95; Số lượt lặp n=5; Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Số liệu định lượng tại Hình 5.4 chỉ rõ bước nhảy vọt về mặt chất lượng dịch vụ khi kích hoạt cơ chế bảo vệ đề xuất:\n"
            "- Ở trạng thái Cơ sở (Baseline - màu đỏ vân chéo), khi không có sự can thiệp của bộ lọc giới hạn và bộ đệm, lưu lượng dồn dập "
            "của Aggressor chiếm đoạt toàn bộ luồng xử lý và kết nối cơ sở dữ liệu. Kết quả là độ trễ trung vị p50 của tất cả các thuê bao bình thường "
            "bị đẩy vọt lên ngưỡng 188.0 – 233.3 ms; độ trễ đuôi p95 bị kéo giãn nghiêm trọng tới 1.166.0 – 1.526.5 ms, gây nghẽn tắc diện rộng.\n"
            "- Ở trạng thái Đề xuất (Proposed - màu xanh chấm bi), bộ lọc TenantRateLimitFilter dập tắt bão lưu lượng của Aggressor ngay tại tầng biên. "
            "Nhờ đó, độ trễ trung vị p50 của các thuê bao Nhỏ (Acme), Vừa (CTU Pool), Lớn (Lotus) và Chuẩn (Finance) giảm mạnh hơn 3 lần, "
            "hạ xuống chỉ còn 60.5 – 64.6 ms. Độ trễ đuôi p95 của các thuê bao cũng được co gọn đáng kể (giảm 200 – 400 ms), bảo toàn cam kết SLA. "
            "Đáng chú ý, độ trễ p50 của chính Aggressor giảm xuống mức 13.4 ms vì các yêu cầu vượt hạn mức bị từ chối tức thì bằng mã HTTP 429 "
            "ngay tại Middleware mà không làm tiêu tốn tài nguyên phía sau."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Để làm sáng tỏ đóng góp độc lập của từng thành phần kỹ thuật, nghiên cứu tiến hành thực nghiệm bóc tách thành phần (Ablation Study) "
            "qua bốn cấu hình: (1) Baseline (Tắt cả Rate Limit lẫn Cache); (2) Chỉ Rate Limit; (3) Chỉ Cache; và (4) Đề xuất Đầy đủ. "
            "Kết quả đối sánh được tổng hợp tại Hình 5.5."
        )
    })
    
    # Hình 5.5
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_5_doi_sanh_cau_hinh.png',
        'width': 6.2,
        'caption': (
            "Hình 5.5: Đối sánh các cấu hình kiểm soát tài nguyên (Ablation Study).\n"
            "(Khảo sát bóc tách thành phần trên 4 cấu hình: Baseline, Chỉ Rate Limit, Chỉ Cache, và Đề xuất Đầy đủ; "
            "Workload: 80 VUs dồn dập, n=5; Panel a: Thông lượng giao dịch an toàn [RPS]; Panel b: Số kết nối CSDL HikariCP đỉnh điểm [/ 25 kết nối]; "
            "Panel c: Số yêu cầu Aggressor bị chặn đứng tại biên [HTTP 429]; Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Kết quả đối sánh tại Hình 5.5 chứng minh tính hiệp đồng tất yếu giữa cơ chế Rate Limiting và Kiến trúc Bộ nhớ đệm Hai tầng:\n"
            "1. Về thông lượng giao dịch an toàn (Hình 5.5a): Cấu hình Cơ sở chỉ đạt 20.29 RPS do tài nguyên bị nghẽn. "
            "Khi chỉ bật Rate Limit, thông lượng tăng lên 28.50 RPS nhờ cắt bỏ bão lưu lượng. Khi chỉ bật Cache, thông lượng tăng lên 35.80 RPS "
            "nhờ giải phóng năng lực đọc. Tuy nhiên, chỉ khi kích hoạt Đầy đủ cả hai cơ chế, thông lượng hệ thống mới bứt phá lên 47.67 RPS "
            "(tăng trưởng +135% so với Baseline), cho phép phục vụ tối đa nhu cầu của các thuê bao hợp lệ.\n"
            "2. Về kiểm soát kết nối cơ sở dữ liệu (Hình 5.5b): Trong cấu hình Baseline, hồ kết nối HikariCP bị bão hòa tuyệt đối ở mức 25/25 kết nối, "
            "dẫn đến 63 yêu cầu bị thất bại do connection timeout. Khi chỉ có Rate Limit hoặc chỉ có Cache, số kết nối đỉnh lần lượt là 18/25 và 12/25. "
            "Ở cấu hình Đề xuất Đầy đủ, số kết nối CSDL đỉnh điểm giảm xuống mức ấn tượng chỉ còn 4/25 kết nối (giảm 84%), giải phóng 84% năng lực "
            "cho các giao dịch ghi phức tạp.\n"
            "3. Về khống chế hàng xóm ồn ào (Hình 5.5c): Cả hai cấu hình có Rate Limit đều chặn đứng chính xác 11.190 yêu cầu lạm dụng của Aggressor "
            "bằng mã trạng thái HTTP 429 dựa trên thuật toán Token Bucket (1.200 req/phút, refill 20/s, burst 120) lưu trữ nguyên tử trên Redis 7. "
            "Tại cấu hình Đầy đủ, 100% yêu cầu hợp lệ của các thuê bao bình thường được xử lý thành công với tỷ lệ lỗi SLA là 0% tuyệt đối."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Bên cạnh hiệu năng, khả năng tùy biến động không sửa mã nguồn (K4) là tiêu chí sống còn của SaaS Cấp độ 3. "
            "Hình 5.6 mô tả toàn bộ chu trình khép kín 6 bước trong vòng đời cấu hình động, từ lúc Quản trị viên thay đổi thiết lập "
            "cho đến khi giao diện người dùng nhận biết và áp dụng tức thời."
        )
    })
    
    # Hình 5.6
    content.append({
        'type': 'figure',
        'path': 'output/hinh_5_6_vong_doi_cau_hinh_k4.png',
        'width': 6.2,
        'caption': (
            "Hình 5.6: Vòng đời tùy biến cấu hình động và đồng bộ bộ nhớ đệm đa tầng (KB-4).\n"
            "(Chu trình 6 bước khép kín: Quản trị viên đổi cấu hình → Commit CSDL Postgres an toàn → Vô hiệu hóa đệm L1 cục bộ & Bắn Pub/Sub → "
            "Lan truyền cụm API qua kênh tenant-events [2.45 ± 0.65 ms] → Nạp lại đệm L1 theo cơ chế Lazy [0.12 ms vs 18.5 ms đọc DB] → "
            "Áp dụng tức thời trên UI React với kiểm tra luật STRICT / WARN và trường động JSONB; Nguồn: run manifest commit 7c43e4e)."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Dữ liệu thực nghiệm từ Hình 5.6 giải quyết triệt để sự đánh đổi truyền thống giữa tốc độ đọc đệm và tính tươi mới của dữ liệu cấu hình:\n"
            "- Thao tác đọc đệm siêu tốc: Khi cấu hình được nạp sẵn trên bộ nhớ L1 Caffeine (tenant:{id}:config), thời gian nạp cấu hình chỉ mất 0.12 ms "
            "(nhanh hơn gấp 150 lần so với truy vấn CSDL vật lý mất 18.5 ms). Chính sách thu hồi W-TinyLFU đảm bảo tỷ lệ trúng đệm duy trì ở mức cao 76% – 97%.\n"
            "- Đồng bộ sự kiện thời gian thực: Khi Quản trị viên thay đổi chế độ WIP từ STRICT sang WARN, giao dịch được commit bền vững vào PostgreSQL "
            "và ngay lập tức phát sự kiện thu hồi qua kênh Redis Pub/Sub tenant-events. Độ trễ lan truyền thông điệp tới toàn bộ các thể hiện API "
            "chỉ mất 2.45 ± 0.65 ms, đảm bảo toàn bộ cụm dịch vụ được làm sạch đệm đồng nhất.\n"
            "- Thực thi nghiệp vụ chuẩn xác: Yêu cầu kế tiếp của người dùng kích hoạt cơ chế nạp đệm lười (Lazy Reload) từ CSDL. Giao diện người dùng "
            "áp dụng ngay lập tức quy tắc mới: tại t-acme (chế độ STRICT), thao tác kéo thẻ vượt hạn mức bị chặn với HTTP 422; tại t-lotus (chế độ WARN), "
            "hệ thống cho phép lưu thẻ thành công kèm cờ wipWarning = true. Đồng thời, các trường mở rộng lưu trong cột JSONB được kiểm tra hợp lệ "
            "tại thời điểm chạy mà không đòi hỏi bất kỳ sự thay đổi lược đồ vật lý nào."
        )
    })
    
    # 5.4
    content.append({
        'type': 'h2',
        'text': '5.4. Bàn luận Tổng hợp và Đóng vòng lặp Bảy Thách thức Đa thuê bao'
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Dựa trên chuỗi bằng chứng thực nghiệm thu thập từ Hình 5.1 đến Hình 5.6, nghiên cứu tổng kết mức độ giải quyết "
            "bảy thách thức thiết kế cốt lõi đã đặt ra từ Chương 1, chứng minh tính toàn vẹn và vượt trội của mô hình SaaS Kanban Cấp độ 3:\n"
            "1. Thách thức 1 (Định danh và quản lý ngữ cảnh luồng): Được giải quyết trọn vẹn thông qua đường ống lọc kép JwtTenantFilter kết hợp "
            "ThreadLocal tự dọn dẹp bằng khối try ... finally. Kết quả kiểm chứng tại Hình 5.3a khẳng định tỷ lệ chặn truy cập sai lệch đạt 100% "
            "và tỷ lệ rò rỉ ngữ cảnh đạt 0% tuyệt đối dưới áp lực 1.500 yêu cầu luân chuyển trên hồ luồng dùng chung.\n"
            "2. Thách thức 2 (Cô lập dữ liệu và kiểm soát bán kính sự cố): Được phòng thủ vững chắc nhờ cơ chế rào chắn hai lớp tại nhân CSDL "
            "(tài khoản NOBYPASSRLS, biến phiên SET LOCAL, chính sách FORCE ROW LEVEL SECURITY) kết hợp phân vùng tiền tố khóa bộ đệm. "
            "Hình 5.3b chứng minh cơ chế Fail-Closed bảo vệ dữ liệu thành công (0 leak) ngay cả khi lập trình viên bỏ sót mệnh đề WHERE hoặc bị tấn công IDOR; "
            "trong khi Hình 5.3c xác nhận chi phí vi mô của RLS chỉ tăng thêm 0.45 ms.\n"
            "3. Thách thức 3 (Quản trị hiệu năng và hạn chế hàng xóm ồn ào): Được giải quyết triệt để nhờ sự phối hợp giữa bộ lọc Token Bucket tại biên "
            "và bộ nhớ đệm hai tầng L1 Caffeine + L2 Redis cùng chỉ mục tổ hợp B-Tree dẫn đầu bởi tenant_id. "
            "Hình 5.4 và Hình 5.5 chứng minh hệ thống đã dập tắt hoàn toàn bão lưu lượng của Aggressor (chặn 11.190 yêu cầu với HTTP 429), "
            "hạ độ trễ trung vị p50 của các thuê bao bình thường từ ~200 ms xuống 60–64 ms, giảm 84% tải kết nối CSDL và tăng thông lượng toàn hệ thống thêm +135%.\n"
            "4. Thách thức 4 (Tùy biến lúc chạy và quản trị tính năng): Được giải quyết thông qua Động cơ tùy biến 3 lớp (Giao diện, Quy trình nghiệp vụ WIP, "
            "Trường mở rộng JSONB) dựa trên siêu dữ liệu. Hình 5.6 minh chứng vòng đời cập nhật cấu hình khép kín với thời gian lan truyền Pub/Sub chỉ 2.45 ms "
            "và thời gian đọc đệm siêu tốc 0.12 ms, cho phép vận hành đồng thời các tổ chức có quy tắc nghiệp vụ trái ngược nhau trên cùng một phiên bản mã nguồn duy nhất.\n"
            "5. Thách thức 5 (Tự động hóa vòng đời thuê bao và Mặt phẳng điều khiển): Kiến trúc phân tách rõ ràng Mặt phẳng Điều khiển và Mặt phẳng Dữ liệu "
            "đã tự động hóa toàn diện quy trình đăng ký, cấp phát không gian làm việc, cấu hình mặc định và khởi tạo tài khoản quản trị theo giao dịch khép kín "
            "chỉ trong vài giây mà không cần can thiệp thủ công vào hạ tầng.\n"
            "6. Thách thức 6 (Sao lưu, phục hồi cấp thuê bao và nâng cấp không gián đoạn): Việc áp dụng công cụ Flyway trên lược đồ dùng chung duy nhất "
            "loại bỏ hoàn toàn hiện tượng lệch phiên bản (Schema Drift), cho phép nâng cấp hệ thống tập trung một lần duy nhất cho toàn bộ các thuê bao "
            "mà không gây gián đoạn dịch vụ; dữ liệu từng thuê bao có thể dễ dàng trích xuất logic thông qua khóa tenant_id.\n"
            "7. Thách thức 7 (Đo lường mức tiêu thụ tài nguyên và giám sát nhận thức thuê bao): Nhãn chẩn đoán MDC [tenant_id=...] kết hợp các chỉ số "
            "Prometheus và cAdvisor (Hình 5.1) đã thiết lập khả năng quan sát toàn diện theo từng mã định danh thuê bao, hỗ trợ phát hiện sớm điểm nghẽn "
            "và phục vụ hạch toán chi phí công bằng, chính xác."
        )
    })
    
    content.append({
        'type': 'p',
        'text': (
            "Tóm lại, thông qua chuỗi thực nghiệm định lượng được thiết kế bài bản và minh chứng thuyết phục qua 6 hình vẽ khoa học, "
            "nguyên mẫu SaaS Kanban Cấp độ 3 đề xuất đã chứng minh sự vượt trội toàn diện về tính an toàn cô lập, hiệu năng vận hành "
            "và tính linh hoạt tùy biến, hiện thực hóa thành công các mục tiêu nghiên cứu đã đặt ra."
        )
    })
    
    return content

def create_standalone_chapter5_docx(output_path):
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(1.1)
        section.right_margin = Inches(0.8)

    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)

    items = build_chapter_5_content()
    
    for item in items:
        itype = item['type']
        if itype == 'h1':
            h = doc.add_paragraph()
            h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(14)
            r = h.add_run(item['text'])
            r.font.bold = True
            r.font.size = Pt(14)
        elif itype == 'h2':
            h = doc.add_paragraph()
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(6)
            r = h.add_run(item['text'])
            r.font.bold = True
            r.font.size = Pt(13)
        elif itype == 'p':
            p = doc.add_paragraph(item['text'])
            p.paragraph_format.line_spacing = 1.3
            p.paragraph_format.space_after = Pt(8)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        elif itype == 'figure':
            if os.path.exists(item['path']):
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(2)
                r_img = p_img.add_run()
                r_img.add_picture(item['path'], width=Inches(item.get('width', 6.0)))
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(8)
            r_cap = p_cap.add_run(item['caption'])
            r_cap.font.italic = True
            r_cap.font.size = Pt(10)
            r_cap.font.color.rgb = RGBColor(51, 65, 85)

    doc.save(output_path)
    print(f"[✓] Created: {output_path}")

def update_report_v2_docx():
    doc_path = 'output/Report_v2.docx'
    doc = docx.Document(doc_path)
    
    # 1. Find p_start (CHƯƠNG 5) and p_end (KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN)
    start_p_idx = None
    end_p_idx = None
    for idx, p in enumerate(doc.paragraphs):
        if 'CHƯƠNG 5: THIẾT LẬP THỰC NGHIỆM' in p.text.upper() and start_p_idx is None:
            start_p_idx = idx
        if 'KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN' in p.text.upper() and start_p_idx is not None:
            end_p_idx = idx
            break
            
    print(f"Report_v2.docx: Chapter 5 found at paragraph {start_p_idx} to {end_p_idx}")
    p_start = doc.paragraphs[start_p_idx]
    p_end = doc.paragraphs[end_p_idx]
    
    # Create a marker paragraph right before p_end
    marker = p_end.insert_paragraph_before()
    first_new_p = None
    
    # Insert all new items before marker
    items = build_chapter_5_content()
    for item in items:
        itype = item['type']
        if itype == 'h1':
            h = marker.insert_paragraph_before()
            if first_new_p is None:
                first_new_p = h
            h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(14)
            r = h.add_run(item['text'])
            r.font.name = 'Times New Roman'
            r.font.bold = True
            r.font.size = Pt(14)
        elif itype == 'h2':
            h = marker.insert_paragraph_before()
            if first_new_p is None:
                first_new_p = h
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(6)
            r = h.add_run(item['text'])
            r.font.name = 'Times New Roman'
            r.font.bold = True
            r.font.size = Pt(13)
        elif itype == 'p':
            p = marker.insert_paragraph_before(item['text'])
            if first_new_p is None:
                first_new_p = p
            p.paragraph_format.line_spacing = 1.3
            p.paragraph_format.space_after = Pt(8)
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(12)
        elif itype == 'figure':
            if os.path.exists(item['path']):
                p_img = marker.insert_paragraph_before()
                if first_new_p is None:
                    first_new_p = p_img
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(2)
                r_img = p_img.add_run()
                r_img.add_picture(item['path'], width=Inches(item.get('width', 6.0)))
            
            p_cap = marker.insert_paragraph_before()
            if first_new_p is None:
                first_new_p = p_cap
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(8)
            r_cap = p_cap.add_run(item['caption'])
            r_cap.font.name = 'Times New Roman'
            r_cap.font.italic = True
            r_cap.font.size = Pt(10)
            r_cap.font.color.rgb = RGBColor(51, 65, 85)

    # Now remove old body elements from p_start up to the first new element
    body = doc._body._element
    old_start_idx = body.index(p_start._p)
    new_start_idx = body.index(first_new_p._p)
    old_elements = [body[i] for i in range(old_start_idx, new_start_idx)]
    
    print(f"Removing {len(old_elements)} old body elements (paragraphs & tables) from Report_v2.docx...")
    for el in old_elements:
        body.remove(el)
        
    # Remove marker
    body.remove(marker._p)

    doc.save(doc_path)
    print(f"[✓] Successfully updated: {doc_path}")

def update_report_v2_md():
    md_path = 'output/Report_v2.md'
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_line = None
    end_line = None
    for idx, l in enumerate(lines):
        if '# **CHƯƠNG 5: THIẾT LẬP THỰC NGHIỆM' in l and start_line is None:
            start_line = idx
        if '# **KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN' in l and start_line is not None:
            end_line = idx
            break

    print(f"Report_v2.md: Chapter 5 found at lines {start_line} to {end_line}")

    items = build_chapter_5_content()
    new_md_lines = []

    for item in items:
        itype = item['type']
        if itype == 'h1':
            new_md_lines.append(f"# **{item['text']}**\n\n")
        elif itype == 'h2':
            new_md_lines.append(f"## **{item['text']}**\n\n")
        elif itype == 'p':
            new_md_lines.append(f"{item['text']}\n\n")
        elif itype == 'figure':
            # filename
            fname = os.path.basename(item['path'])
            new_md_lines.append(f"![{fname}]({fname})\n\n")
            cap_lines = item['caption'].split('\n')
            new_md_lines.append(f"*{cap_lines[0]}*\n")
            if len(cap_lines) > 1:
                new_md_lines.append(f"*{cap_lines[1]}*\n\n")
            else:
                new_md_lines.append("\n")

    full_updated_lines = lines[:start_line] + new_md_lines + lines[end_line:]
    with open(md_path, 'w', encoding='utf-8') as f:
        f.writelines(full_updated_lines)

    print(f"[✓] Successfully updated: {md_path}")

if __name__ == '__main__':
    create_standalone_chapter5_docx('output/Chuong_5_Ban_Moi_Nhat_Hoan_Chinh.docx')
    create_standalone_chapter5_docx('output/Chuong_5_Ket_Qua_Thuc_Nghiem.docx')
    update_report_v2_docx()
    update_report_v2_md()
