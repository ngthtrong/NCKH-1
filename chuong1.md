
CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VÀ MÔ HÌNH HÓA KHÁI NIỆM ĐA THUÊ BAO (MULTI-TENANCY)
Tài liệu tham chiếu cốt lõi: 1. Jaap Kabbedijk, Cor-Paul Bezemer, Slinger Jansen, Andy Zaidman (2015), “Defining Multi-Tenancy: A Systematic Mapping Study on the Academic and the Industrial Perspective”, Journal of Systems and Software (JSS), Elsevier, Vol. 100, pp. 139–148. 2. Frederick Chong, Gianpaolo Carraro (2006), “Architecture Strategies for Catching the Long Tail”, Microsoft MSDN Library. 3. Microsoft Azure Architecture Center (2025–2026), “Architect Multitenant Solutions on Azure: Considerations & Approaches”. 4. Amazon Web Services (AWS) Whitepaper (Tod Golding, 2022–2024), “SaaS Architecture Fundamentals & AWS Well-Architected SaaS Lens”. 5. Peter Mell, Timothy Grance (2011), “The NIST Definition of Cloud Computing”, NIST Special Publication 800-145.

PHẦN 1: ĐÁNH GIÁ, KIỂM CHỨNG VÀ TINH CHỈNH VĂN PHONG HỌC THUẬT
1.1. Chuẩn hóa Ngôn ngữ Khoa học Khách quan (Loại bỏ Ngôn từ Cảm xúc và Thái quá)
Trong nghiên cứu khoa học kỹ thuật, tính chính xác và khách quan là nguyên tắc tối thượng. Bản cập nhật này đã rà soát toàn diện và thay thế toàn bộ các từ ngữ mang tính cảm xúc, tuyệt đối hóa (hyperbole) bằng thuật ngữ kỹ thuật chính xác: * Thay thế các từ “Tuyệt đối / Hoàn toàn”: * Bản cũ: “Ngăn chặn tuyệt đối việc truy cập trái phép…” / “Cô lập tuyệt đối”. * Bản chuẩn hóa: “Kiểm soát nghiêm ngặt quyền truy cập…” / “Đảm bảo mức độ cô lập cao nhất trong khả năng cho phép của mô hình logic” / “Giảm thiểu tối đa rủi ro rò rỉ dữ liệu chéo (cross-tenant data leakage)”. * Thay thế các từ ngữ phóng đại về kinh tế và vận hành: * Bản cũ: “…dẫn đến sự sụp đổ của mô hình ASP…” / “…chi phí vận hành khổng lồ…” / “…chi phí biên tiệm cận 0”. * Bản chuẩn hóa: “…dẫn đến sự bế tắc trong việc mở rộng quy mô (scalability bottleneck) của mô hình ASP…” / “…chi phí vận hành tăng tuyến tính và suy giảm hiệu quả đầu tư…” / “…chi phí biên giảm đáng kể, tối ưu hóa biên lợi nhuận của nhà cung cấp”. * Chuẩn hóa diễn đạt thuộc tính “Trong suốt” (Transparently): * Bản cũ: “…hoàn toàn không cảm nhận hoặc nhận biết được sự hiện diện của khách hàng khác; hệ thống mang lại trải nghiệm độc lập như thể họ sở hữu toàn bộ hệ thống riêng biệt.” * Bản chuẩn hóa: “…sự chia sẻ tài nguyên diễn ra một cách trong suốt (transparent). Người dùng cuối trải nghiệm dịch vụ với mức độ độc lập về logic và hiệu năng tương đương như khi vận hành trên một hệ thống dành riêng (dedicated system), dù thực tế tài nguyên tính toán và lưu trữ đang được chia sẻ ở các tầng bên dưới.”
1.2. Tính Nhất quán và Khớp nối Xuyên suốt Báo cáo
Các thách thức cốt lõi được hệ thống hóa tại Mục 1.6 (Quản lý Định danh & Điều hướng, Cô lập Dữ liệu & Bán kính Sự cố, Hiệu ứng Hàng xóm Ồn ào, Bộ máy Đo lường Tài nguyên,…) được xác lập làm Bộ tiêu chí đánh giá (Evaluation Framework). Toàn bộ các tiêu chí này được giải quyết bằng các kỹ thuật và kịch bản kiến trúc tại Chương 2, sau đó được đo lường, kiểm chứng bằng thực nghiệm định lượng tại Chương 4 và Chương 5, đảm bảo tính liên kết học thuật chặt chẽ từ lý thuyết đến thực nghiệm.

PHẦN 2: DÀN Ý CHI TIẾT CHÍNH THỨC CHO CHƯƠNG 1
CHƯƠNG 1: CƠ SỞ LÝ THUYẾT VÀ MÔ HÌNH HÓA KHÁI NIỆM ĐA THUÊ BAO (MULTI-TENANCY)
│
├── 1.1. TỔNG QUAN VỀ SAAS VÀ ĐỘNG LỰC HÌNH THÀNH KIẾN TRÚC ĐA THUÊ BAO
│   ├── 1.1.1. Mô hình Phần mềm dưới dạng Dịch vụ (SaaS): Khái niệm, Đặc điểm và Mục tiêu Kinh tế
│   ├── 1.1.2. Tiến trình Tiến hóa của các Mô hình Chia sẻ Tài nguyên Điện toán
│   ├── 1.1.3. Mối liên hệ Kinh tế - Kỹ thuật giữa SaaS và Kiến trúc Đa thuê bao (Multi-Tenancy)
│   └── 1.1.4. Đánh giá Mức độ Trưởng thành Kiến trúc SaaS theo Mô hình Chong & Carraro
│
├── 1.2. ĐỊNH NGHĨA VÀ SỰ PHÂN KỲ GÓC NHÌN VỀ ĐA THUÊ BAO (MULTI-TENANCY)
│   ├── 1.2.1. Khảo cứu Hệ thống về Định nghĩa Đa thuê bao (Kabbedijk et al., 2015)
│   ├── 1.2.2. Sự Phân kỳ Góc nhìn giữa Giới Học thuật và Giới Công nghiệp
│   ├── 1.2.3. Phân tích Tần suất Thuật ngữ và Tiêu chí Đánh giá một Định nghĩa Chuẩn mực
│   └── 1.2.4. Định nghĩa Khoa học Chuẩn hóa về Đa thuê bao và Phân tích Thuộc tính Cốt lõi
│
├── 1.3. CHUẨN HÓA THUẬT NGỮ VÀ NĂM ĐẶC TRƯNG KIẾN TRÚC CỐT LÕI
│   ├── 1.3.1. Chuẩn hóa Bộ ba Khái niệm Nền tảng: Thuê bao (Tenant) – Dịch vụ (Service) – Thực thể Vận hành (Instance)
│   └── 1.3.2. Năm Đặc trưng Kiến trúc Cốt lõi của Hệ thống Đa thuê bao Hiện đại
│
├── 1.4. PHÂN BIỆT VÀ MÔ HÌNH HÓA CÁC KHÁI NIỆM DỄ NHẦM LẪN (ST, MI, MU, MT)
│   ├── 1.4.1. Bản chất Kỹ thuật của Bốn Mô hình: ST, MI, MU và MT
│   ├── 1.4.2. Bảng Đối chiếu Đa Tiêu chí Phân định Bản chất Hệ thống
│   └── 1.4.3. Sơ đồ Mô hình hóa Trực quan So sánh Bốn Khái niệm
│
├── 1.5. TÁI ĐỊNH NGHĨA NGĂN XẾP HỆ THỐNG (FIGURE 2 MỚI) VÀ KHÁI NIỆM RANH GIỚI THUÊ BAO
│   ├── 1.5.1. Phân tích Ngăn xếp Phần mềm Nguyên bản (Figure 2) của Kabbedijk et al. (2015)
│   ├── 1.5.2. Động lực Dịch chuyển Công nghệ và Đề xuất Mô hình Ngăn xếp Cập nhật cho Kỷ nguyên Cloud-Native
│   ├── 1.5.3. Định nghĩa Chi tiết 9 Tầng Thành phần trong Ngăn xếp Đa thuê bao Hiện đại
│   ├── 1.5.4. Đề xuất Khái niệm “Ranh giới Thuê bao” (Tenant Boundary) và Phổ Độ dày Ranh giới từ Nghịch lý của Tính Trong suốt
│   └── 1.5.5. Mô hình Hóa Tổng thể Kiến trúc Đa thuê bao (Mô hình Tích hợp Đầy đủ)
│
└── 1.6. CÁC KHÍA CẠNH XEM XÉT VÀ THÁCH THỨC CỐT LÕI TRONG THIẾT KẾ ĐA THUÊ BAO
    ├── 1.6.1. Định danh, Ánh xạ Yêu cầu và Quản lý Tên miền (Identity, Tenant Resolution & Routing)
    ├── 1.6.2. Cô lập Thuê bao và Kiểm soát Bán kính Ảnh hưởng Sự cố (Tenant Isolation & Blast Radius)
    ├── 1.6.3. Quản trị Hiệu năng và Ngăn chặn Hiệu ứng Hàng xóm Ồn ào (Noisy Neighbor Problem)
    ├── 1.6.4. Vòng đời Thuê bao và Mặt phẳng Điều khiển Tập trung (Tenant Lifecycle & Control Plane)
    ├── 1.6.5. Khả năng Tùy biến Lúc chạy và Quản trị Tính năng (Runtime Customization & Feature Governance)
    ├── 1.6.6. Chiến lược Sao lưu, Phục hồi Thảm họa và Cập nhật Hệ thống (Backup, DR & Rolling Updates)
    └── 1.6.7. Thách thức Kỹ thuật trong Xây dựng Bộ máy Đo lường Tài nguyên (Metering Engine) và Ánh xạ Định giá

PHẦN 3: HƯỚNG DẪN TRIỂN KHAI CHI TIẾT TỪNG TIỂU MỤC CỦA CHƯƠNG 1
MỤC 1.1: TỔNG QUAN VỀ SAAS VÀ ĐỘNG LỰC HÌNH THÀNH KIẾN TRÚC ĐA THUÊ BAO
1.1.1. Mô hình Phần mềm dưới dạng Dịch vụ (SaaS): Khái niệm, Đặc điểm và Mục tiêu Kinh tế
· Mục tiêu của tiểu mục: Xác lập SaaS là bối cảnh nền tảng của toàn bộ nghiên cứu; phân định rõ SaaS trước hết là một mô hình kinh doanh và chuyển giao phần mềm.
· Luận điểm và Kiến thức cốt lõi:
o Định nghĩa: SaaS (Software as a Service) là mô hình kinh doanh và phân phối phần mềm, trong đó ứng dụng được nhà cung cấp lưu trữ, vận hành tập trung trên hạ tầng điện toán đám mây và phân phối tới người dùng qua mạng Internet. Khách hàng chi trả chi phí định kỳ theo dạng thuê bao (Subscription-based) thay vì mua bản quyền sử dụng vĩnh viễn (Perpetual License).
o Lợi ích phía Khách hàng (Bên thuê): Chuyển đổi chi phí đầu tư ban đầu (CapEx) sang chi phí vận hành linh hoạt (OpEx), giảm bớt gánh nặng thiết lập hạ tầng phần cứng và đội ngũ bảo trì hệ thống cục bộ.
o Lợi ích phía Nhà cung cấp (SaaS Provider): Hình thành nguồn doanh thu định kỳ có tính tích lũy và dự báo được (Recurring Revenue / ARR), tập trung hóa quy trình phát hành và kiểm soát phiên bản phần mềm.
· Văn phong học thuật mẫu:

> “Sự phát triển của điện toán đám mây đã định hình lại phương thức chuyển giao giá trị phần mềm. Mô hình Phần mềm dưới dạng Dịch vụ (SaaS) dần thay thế phương thức cấp phép cài đặt cục bộ (On-premises). Theo định hướng từ Microsoft Azure Architecture Center và AWS SaaS Factory (Golding, 2022), SaaS về bản chất là một mô hình kinh doanh và phương thức vận hành dịch vụ (business and operating model). Việc áp dụng SaaS hướng tới việc thiết lập một quy trình vận hành thống nhất, tối ưu hóa sự linh hoạt trong phát triển và giảm thiểu chi phí chuyển giao giá trị đến khách hàng.”
> 1.1.2. Tiến trình Tiến hóa của các Mô hình Chia sẻ Tài nguyên Điện toán
> · Mục tiêu của tiểu mục: Đặt kiến trúc Đa thuê bao vào tiến trình lịch sử phát triển của ngành công nghệ phần mềm, chứng minh đây là bước tiến tự nhiên nhằm giải quyết bài toán hiệu quả kinh tế của tài nguyên điện toán.
> · Luận điểm cần trình bày (Kế thừa tổng hợp của Kabbedijk et al., 2015):

1. Kỷ nguyên Chia sẻ thời gian (Time-sharing - Thập niên 1960s): Do chi phí máy tính lớn (Mainframe) rất cao, các tổ chức thuê chung năng lực xử lý CPU và lưu trữ trên mainframe để tối ưu hóa chi phí (Wilkes, 1975).
2. Kỷ nguyên Nhà cung cấp Dịch vụ Ứng dụng (Application Service Provider - ASP - Thập niên 1990s): Mô hình ASP cho phép khách hàng sử dụng phần mềm được lưu trữ từ xa. Tuy nhiên, mỗi khách hàng thường được cấp phát một máy chủ vật lý riêng biệt hoặc tiến trình độc lập (Smith & Kumar, 2004). Mô hình này gặp bế tắc trong việc mở rộng quy mô (scalability bottleneck) khi số lượng khách hàng tăng lên, do chi phí bảo trì và quản lý các bản thể riêng lẻ tăng tuyến tính.
3. Kỷ nguyên Ứng dụng Web Đa người dùng (Multi-User Web Applications - Thập niên 2000s): Các dịch vụ web tiêu dùng (Hotmail, Facebook, Google) chứng minh khả năng phục vụ hàng triệu người dùng trên cùng một hạ tầng dùng chung, nhưng toàn bộ người dùng sử dụng cùng một chức năng cố định, không đáp ứng được yêu cầu tùy biến tổ chức (Bezemer & Zaidman, 2010).
4. Kỷ nguyên SaaS Đa thuê bao hiện đại (Modern Multi-Tenant SaaS): Khắc phục hạn chế của các giai đoạn trước: kết hợp khả năng chia sẻ tài nguyên quy mô lớn của Multi-User với khả năng cấu hình và tùy biến chuyên biệt cho từng tổ chức khách hàng.
   · Hình ảnh/Sơ đồ: Vẽ lưu đồ tiến trình lịch sử (Timeline Diagram): Time-sharing (1960s)  ASP (1990s)  Multi-User Web (2000s)  Modern Multi-Tenant SaaS (Hiện nay).
   1.1.3. Mối liên hệ Kinh tế - Kỹ thuật giữa SaaS và Kiến trúc Đa thuê bao (Multi-Tenancy)
   · Mục tiêu của tiểu mục: Khẳng định vai trò của Multi-Tenancy: không phải là mục tiêu tự thân mà là giải pháp kiến trúc hỗ trợ trực tiếp cho mô hình kinh tế của SaaS.
   · Luận điểm logic khoa học:
   o SaaS không đồng nghĩa với Multi-Tenancy: Về mặt lý thuyết, dịch vụ SaaS hoàn toàn có thể được triển khai bằng kiến trúc Single-Tenant (mỗi khách hàng một máy chủ ảo, một cơ sở dữ liệu riêng biệt).
   o Hạn chế kinh tế của Single-Tenant SaaS: Khi số lượng khách hàng tăng cao, việc duy trì kiến trúc Single-Tenant khiến tổng chi phí sở hữu (Total Cost of Ownership - TCO) tăng tuyến tính theo cấp số cộng . Tình trạng cấp phát dư thừa tài nguyên để phục vụ các đỉnh tải ngắn hạn (over-provisioning), kết hợp chi phí vận hành và nâng cấp hàng nghìn môi trường phân mảnh, sẽ làm suy giảm nghiêm trọng biên lợi nhuận của nhà cung cấp.
   o Multi-Tenancy là đòn bẩy kiến trúc (Architectural Enabler): Cho phép nhiều khách hàng chia sẻ tài nguyên tính toán và lưu trữ, hiện thực hóa Tính kinh tế theo quy mô (Economies of Scale). Chi phí biên (Marginal Cost) để tích hợp thêm một khách hàng mới giảm đáng kể (). Hiện tượng bù trừ đỉnh tải giữa các nhóm khách hàng (statistical multiplexing / load smoothing) giúp nâng cao tỷ lệ khai thác tài nguyên phần cứng từ 10–15% lên 60–80%.
   · Sơ đồ minh họa: Biểu đồ so sánh tương quan hàm chi phí: Đường chi phí Single-Tenant (tăng dốc tuyến tính) so với Đường chi phí Multi-Tenant (tăng chậm và tiệm cận ngang khi quy mô khách hàng lớn).
   1.1.4. Đánh giá Mức độ Trưởng thành Kiến trúc SaaS theo Mô hình Chong & Carraro
   · Mục tiêu của tiểu mục: Cung cấp khung lý thuyết chuẩn hóa để phân loại và định vị kiến trúc của đề tài dựa trên nghiên cứu kinh điển của Microsoft.
   · Nội dung 4 cấp độ (Chong & Carraro, 2006 - MSDN):
   o Level 1: Ad-Hoc / Custom: Mã nguồn tùy biến riêng, instance riêng cho từng khách hàng (bản chất tương đương mô hình ASP, hoàn toàn là Single-Tenant).
   o Level 2: Configurable per Host: Sử dụng chung một bộ mã nguồn gốc (common codebase), sự khác biệt giữa các khách hàng được thiết lập qua cấu hình tham số, nhưng vẫn vận hành trên các instance riêng biệt (Single-Tenant).
   o Level 3: Configurable, Multi-Tenant-Efficient: Kiến trúc Đa thuê bao chính thức bắt đầu tại cấp độ này. Một instance ứng dụng duy nhất phục vụ đồng thời nhiều khách hàng, cấu hình và ranh giới dữ liệu được phân tách thông qua siêu dữ liệu (metadata-driven architecture).
   o Level 4: Scalable, Configurable, Multi-Tenant-Efficient: Một tầng gồm nhiều instance đa thuê bao giống hệt nhau vận hành trên cụm máy chủ cân bằng tải (load-balanced server farm), hỗ trợ mở rộng động theo chiều ngang (horizontal auto-scaling), cho phép phục vụ thị trường diện rộng (The Long Tail).
   · Định vị đề tài: Hệ thống quản lý công việc của đề tài tập trung giải quyết bài toán cốt lõi ở Level 3 (cấu hình hóa và cô lập dữ liệu đa thuê bao trên cùng instance) và thiết lập nền tảng sẵn sàng cho việc mở rộng theo Level 4.

MỤC 1.2: ĐỊNH NGHĨA VÀ SỰ PHÂN KỲ GÓC NHÌN VỀ ĐA THUÊ BAO (MULTI-TENANCY)
1.2.1. Khảo cứu Hệ thống về Định nghĩa Đa thuê bao (Kabbedijk et al., 2015)
· Mục tiêu của tiểu mục: Dẫn chứng số liệu khoa học từ nghiên cứu khảo cứu hệ thống (SMS) nhằm minh chứng cho sự thiếu nhất quán trong định nghĩa Multi-Tenancy.
· Số liệu thực chứng (Kabbedijk et al., Elsevier JSS):
o Khảo sát 1.371 công trình nghiên cứu  761 bài báo sau khử trùng lặp  sàng lọc còn 48 bài báo toàn văn chuyên sâu.
o Khảo sát song song 371 bài viết và tài liệu kỹ thuật từ giới công nghiệp.
o Kênh xuất bản học thuật: Hội nghị chiếm 56,3%, Tạp chí chiếm 37,5%, Workshops chiếm 6,2%.
o Phân loại công trình: Có đến 54,2% là bài báo đề xuất giải pháp lý thuyết (Solution Proposal), nhưng chỉ có 2,1% (duy nhất 1 bài) là bài báo chia sẻ kinh nghiệm công nghiệp thực tế (Experience Paper). Số liệu này khẳng định nhu cầu cấp thiết về các nghiên cứu thực nghiệm có hệ thống.
1.2.2. Sự Phân kỳ Góc nhìn giữa Giới Học thuật và Giới Công nghiệp
· Mục tiêu của tiểu mục: Phân tích sự khác biệt trong cách tiếp cận, làm rõ nguyên nhân gây ra sự mơ hồ về khái niệm.
· Nội dung so sánh:
o Giới Học thuật: Tiếp cận Multi-Tenancy chủ yếu từ tầng ứng dụng (Application Level) và tầng cơ sở dữ liệu (Database Level). Học thuật coi trọng tính biến đổi lúc chạy (Runtime Variability) và tính toàn vẹn của logic nghiệp vụ giữa các tenant.
o Giới Công nghiệp: Thường tiếp cận Multi-Tenancy từ tầng hạ tầng (Infrastructure/PaaS) (như chia sẻ tài nguyên vật lý thông qua ảo hóa hoặc container). Các tài liệu công nghiệp thường có xu hướng thương mại hóa, gọi chung các hệ thống đám mây dùng chung là “multi-tenant” dù thực tế chỉ đạt mức Multi-User.
o Dẫn chứng sự khác biệt giữa các tập đoàn: Oracle nhìn từ góc độ CSDL, Microsoft nhìn từ góc độ chức năng dịch vụ, IBM nhìn từ góc độ phần mềm trung gian và hạ tầng đám mây.
1.2.3. Phân tích Tần suất Thuật ngữ và Tiêu chí Đánh giá một Định nghĩa Chuẩn mực
· Phân tích Bảng 4 (Table 4 - Word Frequency Analysis của Kabbedijk et al.):
o Tần suất xuất hiện của các từ khóa trong các định nghĩa được khảo sát: Instance (26), Application (24), SaaS (22), Multiple (21), Infrastructure (20), Single (18), Software (15), Customer (15), Share (13), Database (12).
o Hạn chế của các định nghĩa cũ: Đa số bị trói buộc vào một tầng kỹ thuật riêng lẻ và phụ thuộc cứng vào cụm từ “Single Instance”, làm mất tính tổng quát khi hệ thống chuyển sang kiến trúc phân tán hoặc vi dịch vụ (Microservices).
· Năm nguyên tắc xây dựng định nghĩa khoa học (dựa trên Copi & Miller, 1972):

1. Thể hiện rõ các thuộc tính bản chất của đối tượng được định nghĩa.
2. Tránh định nghĩa mang tính luẩn quẩn/vòng tròn (circularity).
3. Định nghĩa không quá rộng và không quá hẹp (bao quát được các tầng: dịch vụ, ứng dụng, CSDL, hạ tầng).
4. Tránh sử dụng từ ngữ tối nghĩa, mơ hồ.
5. Ưu tiên khẳng định thay vì diễn đạt phủ định.
   1.2.4. Định nghĩa Khoa học Chuẩn hóa về Đa thuê bao và Phân tích Thuộc tính Cốt lõi
   · Trích dẫn định nghĩa chuẩn hóa của Kabbedijk et al. (2015): > “Multi-tenancy is a property of a system where multiple customers, so-called tenants, transparently share the system’s resources, such as services, applications, databases, or hardware, with the aim of lowering costs, while still being able to exclusively configure the system to the needs of the tenant.”
   · Phân tích 4 thuộc tính cấu thành định nghĩa:
6. “Transparently” (Trong suốt): Sự chia sẻ tài nguyên diễn ra một cách trong suốt. Người dùng cuối trải nghiệm dịch vụ với mức độ độc lập về logic và hiệu năng tương đương như khi vận hành trên một hệ thống dành riêng, dù thực tế tài nguyên vật lý đang được chia sẻ.
7. “Share system’s resources”: Khẳng định tài nguyên chia sẻ không giới hạn ở một tầng duy nhất mà có thể diễn ra ở tầng Dịch vụ, Ứng dụng, Cơ sở dữ liệu hoặc Hạ tầng.
8. “With the aim of lowering costs”: Khẳng định tối ưu hóa chi phí là mục tiêu kinh tế trung tâm của kiến trúc.
9. “Exclusively configure”: Đảm bảo khả năng tùy biến cấu hình lúc chạy cho từng thuê bao mà không cần chỉnh sửa mã nguồn gốc.

MỤC 1.3: CHUẨN HÓA THUẬT NGỮ VÀ NĂM ĐẶC TRƯNG KIẾN TRÚC CỐT LÕI
1.3.1. Chuẩn hóa Bộ ba Khái niệm Nền tảng: Thuê bao (Tenant) – Dịch vụ (Service) – Thực thể Vận hành (Instance)
· Mục tiêu của tiểu mục: Xác lập khung khái niệm nhất quán bằng tiếng Việt cho toàn bộ đề tài:

1. Thuê bao (Tenant / Đơn vị thuê bao):
   § Đại diện cho một tổ chức khách hàng hoặc một không gian làm việc (Workspace/Organization) đăng ký sử dụng dịch vụ.
   § Phân biệt Tenant vs. User: Thuê bao là đơn vị tổ chức cấp cao, bên trong chứa nhiều người dùng cuối (End-users) cùng chia sẻ một ngữ cảnh dữ liệu, cấu hình nghiệp vụ và chính sách truy cập.
2. Dịch vụ (Service / Dịch vụ phần mềm):
   § Giao diện chức năng nghiệp vụ mà nhà cung cấp cam kết cung ứng cho Thuê bao theo thỏa thuận mức dịch vụ (SLA).
   § Dịch vụ là khái niệm ở mức logic nghiệp vụ (ví dụ: Dịch vụ Quản lý Không gian làm việc, Dịch vụ Bảng công việc Kanban, Dịch vụ Thông báo).
3. Thực thể Vận hành (Instance / Bản thể thực thi):
   § (Trong báo cáo giữ nguyên thuật ngữ kỹ thuật quốc tế là Instance).
   § Là tập hợp các tài nguyên tính toán (tiến trình ứng dụng, bộ nhớ đệm, kết nối CSDL) đang chạy thực tế trên hạ tầng để tiếp nhận và xử lý các yêu cầu của Thuê bao thông qua Dịch vụ.
   1.3.2. Năm Đặc trưng Kiến trúc Cốt lõi của Hệ thống Đa thuê bao Hiện đại
   · Hệ thống hóa đầy đủ 5 đặc trưng kỹ thuật:
4. Chia sẻ tài nguyên trong suốt (Transparent Resource Sharing): Ghép kênh tài nguyên tính toán và lưu trữ giữa nhiều thuê bao mà vẫn duy trì tính độc lập về trải nghiệm sử dụng.
5. Khả năng biến đổi lúc chạy dựa trên Siêu dữ liệu (Runtime Variability / Metadata-driven Customization): Hệ thống thích ứng với các yêu cầu riêng biệt của từng tenant thông qua việc đọc cấu hình siêu dữ liệu (Metadata) mà không làm rẽ nhánh mã nguồn (code branching).
6. Tính cô lập đa chiều giữa các Thuê bao (Multi-dimensional Tenant Isolation):
   § Cô lập Dữ liệu (Data Isolation): Giảm thiểu tối đa rủi ro rò rỉ dữ liệu chéo giữa các thuê bao.
   § Cô lập Hiệu năng (Performance Isolation): Đảm bảo tải hoạt động của một thuê bao không làm suy giảm chất lượng dịch vụ của các thuê bao khác.
   § Cô lập Lỗi (Fault Isolation / Blast Radius): Sự cố kỹ thuật tại một không gian thuê bao không gây gián đoạn dây chuyền cho toàn bộ hệ thống.
7. Khả năng co giãn và phục vụ tự động (Elasticity & Self-Service Provisioning) [BỔ SUNG MỚI]: Hệ thống có khả năng tự động cấp phát tài nguyên và không gian làm việc cho thuê bao mới (automated onboarding) và co giãn tài nguyên linh hoạt theo biến động tải mà không cần can thiệp thủ công từ quản trị viên.
8. Dịch vụ được đo lường và Giám sát sử dụng (Measured Service & Usage Telemetry) [BỔ SUNG MỚI]: Hệ thống có khả năng định lượng, giám sát và báo cáo mức tiêu thụ tài nguyên (CPU, băng thông, dung lượng lưu trữ, số lượng API truy xuất) một cách độc lập cho từng thuê bao. Đặc trưng này là nền tảng cốt lõi để các nền tảng SaaS áp dụng các mô hình định giá linh hoạt (trả theo mức sử dụng - pay-as-you-go, hoặc phân cấp - tier-based) dựa trên giá trị và tính năng mà thuê bao thực sự sử dụng.

MỤC 1.4: PHÂN BIỆT VÀ MÔ HÌNH HÓA CÁC KHÁI NIỆM DỄ NHẦM LẪN (ST, MI, MU, MT)
1.4.1. Bản chất Kỹ thuật của Bốn Mô hình: ST, MI, MU và MT
· Phân tích bản chất kỹ thuật:
o Single-Tenant (ST - Đơn thuê bao): Mỗi khách hàng sử dụng một hệ thống độc lập từ ứng dụng đến CSDL. Mức độ cô lập rất cao nhưng chi phí phần cứng và vận hành tăng tuyến tính theo số lượng khách hàng.
o Multi-Instance (MI - Đa thực thể): Có thể dùng chung hạ tầng máy chủ vật lý ở tầng dưới, nhưng mỗi khách hàng chạy trên một instance ứng dụng và CSDL tách biệt. Giảm bớt xung đột tiến trình nhưng vẫn tiêu tốn tài nguyên quản lý nhiều bản thể độc lập.
o Multi-User (MU - Đa người dùng): Toàn bộ người dùng đăng nhập vào cùng một instance ứng dụng và CSDL dùng chung. Phục vụ người dùng cá nhân với chức năng bất biến, không hỗ trợ tùy biến cấu trúc dữ liệu hoặc quy trình nghiệp vụ cấp tổ chức.
o Multi-Tenant (MT - Đa thuê bao): Phục vụ các tổ chức khách hàng trên các tầng tài nguyên chia sẻ trong suốt, đồng thời hỗ trợ tùy biến cấu trúc và quy trình nghiệp vụ lúc chạy thông qua cơ chế quản lý siêu dữ liệu.
1.4.2. Bảng Đối chiếu Đa Tiêu chí Phân định Bản chất Hệ thống
· Mở rộng Bảng 5 (Table 5 của Kabbedijk et al.) thành ma trận đối chiếu 5 tiêu chí học thuật:
Tiêu chí So sánh
Single-Tenant (ST)
Multi-Instance (MI)
Multi-User (MU)
Multi-Tenant (MT)
Đối tượng Phục vụ
1 Khách hàng tổ chức
Nhiều Khách hàng tổ chức
Nhiều Người dùng cá nhân riêng lẻ
Nhiều Khách hàng tổ chức (chứa nhiều User)
Chia sẻ Tài nguyên Ứng dụng
Không (Instance độc lập)
Không (Mỗi khách 1 instance ứng dụng riêng)
Có (Dùng chung 1 instance)
Có (Chia sẻ trong suốt ở 1 hoặc nhiều tầng)
Tùy biến lúc chạy (Runtime Variability)
Trực tiếp trên mã nguồn/máy chủ
Trên từng instance độc lập
Không có / Chỉ cấu hình cá nhân cơ bản
Hỗ trợ đầy đủ qua Siêu dữ liệu (Metadata)
Mức độ Cô lập (Isolation)
Rất cao (Tách biệt vật lý hoặc tiến trình)
Rất cao (Tách biệt ở mức tiến trình ứng dụng)
Thấp (Phân tách theo User ID thông thường)
Được bảo đảm bằng Ranh giới cô lập logic và kỹ thuật phòng thủ chiều sâu
Chi phí Vận hành Biên (Marginal Cost)
Cao ( - Tăng tuyến tính)
Tương đối cao (Tốn tài nguyên duy trì nhiều instance)
Thấp (Tiệm cận mức tối ưu)
Tối ưu hóa nhờ quy mô kinh tế

1.4.3. Sơ đồ Mô hình hóa Trực quan So sánh Bốn Khái niệm
· Mô tả trực quan hóa: Thiết kế sơ đồ thể hiện mối quan hệ ánh xạ giữa Thuê bao/Người dùng  Dịch vụ  Instance:
o Mô hình ST: 1 Thuê bao  1 Dịch vụ  1 Instance chuyên biệt.
o Mô hình MI: Nhiều Thuê bao  Dịch vụ chung  Mỗi Thuê bao được phân bổ tới 1 Instance riêng biệt.
o Mô hình MU: Nhiều Người dùng cá nhân  Dịch vụ chung  Cùng trỏ vào 1 Instance duy nhất (tính năng cố định).
o Mô hình MT: Nhiều Thuê bao  Dịch vụ chung  Cùng trỏ vào 1 Instance dùng chung (chứa cơ chế định danh và phân tách logic bên trong).

MỤC 1.5: TÁI ĐỊNH NGHĨA NGĂN XẾP HỆ THỐNG (FIGURE 2 MỚI) VÀ KHÁI NIỆM RANH GIỚI THUÊ BAO
1.5.1. Phân tích Ngăn xếp Phần mềm Nguyên bản (Figure 2) của Kabbedijk et al. (2015)
· Khảo sát cấu trúc Figure 2 gốc: Ngăn xếp 9 tầng:
o Hardware (Nét đứt)
o Virtual Machine (Nét đứt)
o Operating System (Nét đứt)
o Database Server (Nét liền)
o Database (Nét liền)
o Database Schema (Nét liền)
o Middleware (Nét đứt)
o Application Server (Nét liền)
o Application Instance (Nét liền)
· Lý giải của nghiên cứu năm 2014/2015: Nhóm tác giả sử dụng nét đứt cho Hardware, VM, OS và Middleware với lý giải rằng các tầng này nằm ngoài phạm vi can thiệp của đa thuê bao ở cấp độ phần mềm (not influenced by software level multi-tenancy).
1.5.2. Động lực Dịch chuyển Công nghệ và Đề xuất Mô hình Ngăn xếp Cập nhật cho Kỷ nguyên Cloud-Native
· Hai động lực công nghệ làm thay đổi bản chất ngăn xếp sau một thập kỷ:

1. Sự phát triển của Containerization và Hạ tầng Điều khiển bằng Phần mềm (Docker, Kubernetes): Ranh giới giữa Máy ảo (VM), Hệ điều hành (OS) và Máy chủ ứng dụng đã có sự chuyển biến. Việc cô lập tài nguyên được hỗ trợ trực tiếp bằng các cơ chế cấp nhân hệ điều hành (namespaces, cgroups), cho phép can thiệp và phân bổ tài nguyên theo ngữ cảnh từ tầng điều phối ứng dụng.
2. Sự trỗi dậy của Tầng Middleware Nhận thức Thuê bao (Tenant-Aware Middleware): Trong kiến trúc hiện đại, Middleware bao gồm: API Gateway, Distributed Cache (Redis), Message Queue (RabbitMQ/Kafka), Object Storage (MinIO/S3). Toàn bộ các thành phần này ngày nay đều có thể và bắt buộc phải được thiết kế có nhận thức ngữ cảnh thuê bao (Tenant-Aware) (như gắn tenant_id trong Header thông điệp, tiền tố khóa Cache tenant:{id}:key, phân chia đường dẫn Bucket trong Object Storage). Do đó, việc chuyển Middleware từ nét đứt sang nét liền là một hiệu chỉnh khoa học cần thiết, phản ánh đúng hiện trạng kỹ thuật hiện đại.
   · Quy chuẩn ý nghĩa ký hiệu trong Figure 2 cập nhật:
   o Khối Nét liền (Tenant-Aware Shareable Components): Các tầng thành phần mà kiến trúc phần mềm có thể chủ động can thiệp, thiết kế cơ chế chia sẻ tài nguyên và phân tách logic theo ngữ cảnh thuê bao (tenant_id).
   o Khối Nét đứt (Tenant-Agnostic Underlying Infrastructure): Các tầng hạ tầng vật lý và ảo hóa nền tảng bên dưới, mặc định được dùng chung ở mức hệ thống nhưng trong suốt (không nhận thức logic nghiệp vụ thuê bao) đối với mã nguồn ứng dụng.
   1.5.3. Định nghĩa Chi tiết 9 Tầng Thành phần trong Ngăn xếp Đa thuê bao Hiện đại
   · Định nghĩa rõ ràng cho cả 9 tầng từ dưới lên:
3. Hardware (Phần cứng): Năng lực xử lý CPU, RAM, ổ đĩa lưu trữ và thiết bị mạng vật lý. (Nét đứt)
4. Virtual Machine / Container Runtime (Máy ảo / Runtime Container): Lớp ảo hóa phần cứng hoặc môi trường quản lý container (Docker Engine, containerd). (Nét đứt)
5. Operating System (Hệ điều hành): Kernel hệ điều hành máy chủ quản lý việc điều phối tài nguyên cấp thấp. (Nét đứt)
6. Database Server (Máy chủ CSDL): Tiến trình dịch vụ quản trị cơ sở dữ liệu (PostgreSQL, MySQL daemon). (Nét liền)
7. Database (Cơ sở dữ liệu vật lý/logic): Vùng lưu trữ dữ liệu cụ thể do DB Server quản lý. (Nét liền)
8. Database Schema (Lược đồ dữ liệu): Không gian định nghĩa cấu trúc bảng và ràng buộc dữ liệu bên trong một Database. (Nét liền)
9. Middleware (Tầng trung gian): Hệ thống điều phối trung gian bao gồm API Gateway, Redis Cache, Message Queue, Object Storage. (Nét liền - ĐIỂM HIỆU CHỈNH SO VỚI 2015)
10. Application Server (Máy chủ Ứng dụng): Môi trường thực thi ứng dụng (JVM, Node.js runtime, Tomcat, Kestrel). (Nét liền)
11. Application Instance (Thực thể Ứng dụng): Phiên bản mã nguồn ứng dụng đã đóng gói đang thực thi trong bộ nhớ. (Nét liền)
    1.5.4. Đề xuất Khái niệm “Ranh giới Thuê bao” (Tenant Boundary) và Phổ Độ dày Ranh giới từ Nghịch lý của Tính Trong suốt
    · Mục tiêu của tiểu mục: Khẳng định đóng góp học thuật và tư duy mô hình hóa của nhóm nghiên cứu thông qua văn phong biện luận khoa học; thiết lập khái niệm nền tảng về bản chất và phổ độ dày của ranh giới thuê bao.
    · Nội dung luận chứng: > “Dựa trên việc tổng hợp các nghiên cứu trước đây và phân tích thực tiễn kiến trúc SaaS, nhóm nghiên cứu nhận định rằng tồn tại một sự mâu thuẫn nội tại (nghịch lý) trong thiết kế Đa thuê bao:

> Một mặt, nhà cung cấp dịch vụ (SaaS Provider) bị thúc đẩy bởi mục tiêu kinh tế, buộc phải đẩy mạnh việc chia sẻ tài nguyên (Resource Sharing) ở mức sâu nhất có thể nhằm tối đa hóa mật độ khai thác và giảm chi phí vận hành biên (Marginal Cost).
> Mặt khác, khách hàng doanh nghiệp (B2B Tenants) bị ràng buộc bởi các quy định bảo mật, quyền riêng tư dữ liệu và các cam kết chất lượng dịch vụ (SLA/Compliance), đòi hỏi sự tách biệt và an toàn tương đương như một hệ thống dành riêng (Single-Tenant).
> Để giải quyết sự giằng xé giữa ‘Chia sẻ’ và ‘Cô lập’ này nhằm duy trì Đặc trưng ‘Trong suốt’ (đã nêu ở mục 1.3.2), nhóm nghiên cứu đề xuất việc xác lập hệ thống các ‘Ranh giới Thuê bao’ (Tenant Boundaries).
> Ranh giới thuê bao không phải là một rào cản vật lý cố định, mà là các giới hạn cô lập logic hoặc vật lý được thiết kế chủ đích tại từng tầng của Ngăn xếp hệ thống (Figure 2 cập nhật). Đặc biệt, ranh giới này không tồn tại dưới dạng nhị phân đơn giản (có hoặc không có), mà biến thiên trên một dải phổ liên tục gọi là ‘Phổ Độ dày của Ranh giới’ (Boundary Thickness Spectrum): > - Ranh giới Siêu dày (Ultra-Thick Boundaries): Được thực thi bởi các rào cản vật lý độc lập (Hardware, Bare-Metal) hoặc cơ chế ảo hóa phần cứng MMU (Hypervisor VM). Cung cấp sự cô lập tuyệt đối, bán kính sự cố thu hẹp trong một khách hàng đơn lẻ, nhưng đẩy chi phí hạ tầng tăng tuyến tính theo số lượng thuê bao (). > - Ranh giới Độ dày Trung bình (Moderate Boundaries): Được thực thi ở cấp nhân hệ điều hành thông qua công nghệ Container (Linux Namespaces, cgroups v2). Cho phép kiểm soát hạn mức tài nguyên tính toán độc lập trong khi vẫn dùng chung nhân hệ điều hành. > - Ranh giới Mỏng và Siêu mỏng (Thin & Ultra-Thin Boundaries): Được thực thi ở tầng CSDL và mã nguồn ứng dụng thông qua không gian tên dữ liệu (Database Schema) hoặc các vị từ truy vấn logic (WHERE tenant_id = ...) kết hợp cơ chế Row-Level Security (RLS) của DBMS. Mô hình này tối ưu hóa tối đa tính kinh tế theo quy mô (chi phí biên tiệm cận 0), nhưng đòi hỏi hệ thống phải thiết lập các cơ chế phòng thủ chiều sâu (Defense-in-Depth) nghiêm ngặt để triệt tiêu nguy cơ rò rỉ dữ liệu chéo do lỗi lập trình.
> Quyết định lựa chọn độ dày ranh giới tại từng tầng phụ thuộc hoàn toàn vào sự cân bằng giữa bài toán kinh doanh, ngân sách hạ tầng và yêu cầu tuân thủ an toàn thông tin. Đây chính là tiền đề lý thuyết nền tảng định hướng cho toàn bộ việc phân tích đòn bẩy kiến trúc, xây dựng các kịch bản thực chiến và thiết kế các cơ chế kỹ thuật thực thi tại Chương 2.”
> 1.5.5. Mô hình Hóa Tổng thể Kiến trúc Đa thuê bao (Mô hình Tích hợp Đầy đủ)
> · Cấu trúc sơ đồ tổng hợp:
> o Thể hiện mối liên kết giữa các Thuê bao () tương tác qua Dịch vụ (Services).
> o Trỏ vào Instance tổng thể chứa Ngăn xếp 9 tầng của Figure 2 cập nhật.
> o Thể hiện trực quan Đường Ranh giới Thuê bao (Tenant Boundary Line) cắt ngang qua các tầng của Instance, làm cầu nối trực tiếp sang các kịch bản kiến trúc chi tiết tại Chương 2.

MỤC 1.6: CÁC KHÍA CẠNH XEM XÉT VÀ THÁCH THỨC CỐT LÕI TRONG THIẾT KẾ ĐA THUÊ BAO
Khẳng định tính liên kết: 7 khía cạnh này đóng vai trò là Bộ tiêu chí đánh giá (Evaluation Framework), được giải quyết bằng các mẫu kiến trúc tại Chương 2 và được kiểm chứng bằng thực nghiệm định lượng tại Chương 4 & Chương 5.
1.6.1. Định danh, Ánh xạ Yêu cầu và Quản lý Tên miền (Identity, Tenant Resolution & Routing)
· Vấn đề kỹ thuật: Nhận diện chính xác ngữ cảnh thuê bao (tenant_id) từ request gửi đến ngay tại cổng ngõ API Gateway.
· Nội dung xem xét: Phân biệt User Identity và Tenant Context; các phương thức phân giải: Tên miền phụ (Subdomain), Tên miền tùy biến (Custom Domain), Đường dẫn URL Path, HTTP Request Headers, hoặc trích xuất từ JWT Claims.
1.6.2. Cô lập Thuê bao và Kiểm soát Bán kính Ảnh hưởng Sự cố (Tenant Isolation & Blast Radius)
· Vấn đề kỹ thuật: Đảm bảo an toàn dữ liệu giữa các không gian thuê bao và giới hạn phạm vi ảnh hưởng khi xảy ra sự cố.
· Nội dung xem xét: Phòng ngừa lỗ hổng truy cập trực tiếp IDOR (Insecure Direct Object References); kiểm soát Bán kính Ảnh hưởng (Blast Radius) để sự cố của một tenant không tạo phản ứng dây chuyền làm sụp đổ toàn bộ dịch vụ.
1.6.3. Quản trị Hiệu năng và Ngăn chặn Hiệu ứng Hàng xóm Ồn ào (Noisy Neighbor Problem)
· Vấn đề kỹ thuật: Ngăn chặn tình trạng một thuê bao phát sinh tải đột biến làm cạn kiệt tài nguyên dùng chung (CPU, RAM, Connection Pool của CSDL).
· Nội dung xem xét: Cơ chế giới hạn tốc độ yêu cầu (Rate Limiting / Throttling), thiết lập hạn mức tài nguyên (Resource Quotas) và điều phối xử lý công bằng (Fair Queuing).
1.6.4. Vòng đời Thuê bao và Mặt phẳng Điều khiển Tập trung (Tenant Lifecycle & Control Plane)
· Vấn đề kỹ thuật: Quản lý tự động các giai đoạn trong vòng đời thuê bao mà không cần thao tác thủ công.
· Nội dung xem xét: Tách bạch giữa Mặt phẳng Điều khiển (Control Plane) và Mặt phẳng Ứng dụng/Dữ liệu (Application/Data Plane); tự động hóa Onboarding (cấp phát tài nguyên, chạy migration) và Offboarding (khóa dữ liệu, trích xuất dữ liệu, dọn dẹp tài nguyên an toàn).
1.6.5. Khả năng Tùy biến Lúc chạy và Quản trị Tính năng (Runtime Customization & Feature Governance)
· Vấn đề kỹ thuật: Đáp ứng các nhu cầu khác biệt về giao diện, dữ liệu và quy trình mà không làm rẽ nhánh mã nguồn.
· Nội dung xem xét: Tùy biến giao diện (Branding/Logo/Màu sắc), mở rộng trường dữ liệu linh hoạt (Custom Fields), tùy biến luồng công việc; cơ chế kiểm soát quyền hạn tính năng (Capability Governance) chặt chẽ ở backend.
1.6.6. Chiến lược Sao lưu, Phục hồi Thảm họa và Cập nhật Hệ thống (Backup, DR & Rolling Updates)
· Vấn đề kỹ thuật: Vận hành bảo trì liên tục trên môi trường dữ liệu dùng chung phức tạp.
· Nội dung xem xét: Thách thức phục hồi dữ liệu của riêng một thuê bao về một thời điểm cụ thể (Point-in-time recovery per tenant) trong CSDL dùng chung; quy trình cập nhật hệ thống không gián đoạn dịch vụ (Zero-downtime rolling update) và đảm bảo tương thích ngược lược đồ dữ liệu.
1.6.7. Thách thức Kỹ thuật trong Xây dựng Bộ máy Đo lường Tài nguyên (Metering Engine) và Ánh xạ Định giá
· Vấn đề kỹ thuật: Việc định lượng mức tiêu thụ tài nguyên của từng thuê bao là đặc trưng cốt lõi (Mục 1.3.2), nhưng triển khai kỹ thuật đòi hỏi giải quyết bài toán suy giảm hiệu năng.
· Nội dung xem xét: Xây dựng Bộ máy Đo lường (Metering Engine) để thu thập số lượng API calls, dung lượng lưu trữ, thời gian xử lý CPU theo từng tenant_id theo thời gian thực mà không gây nghẽn tiến trình xử lý nghiệp vụ hay làm tăng đột biến độ trễ truy vấn; tính toán chỉ số chi phí đơn vị (Cost-per-Tenant) để ánh xạ vào các mô hình định giá (Tiered, Freemium, Usage-based).

PHẦN 4: DANH MỤC TÀI LIỆU THAM KHẢO CHUẨN TRÍCH DẪN CHO CHƯƠNG 1

1. Kabbedijk, J., Bezemer, C. P., Jansen, S., & Zaidman, A. (2015). Defining multi-tenancy: A systematic mapping study on the academic and the industrial perspective. Journal of Systems and Software, 100, 139-148.
2. Chong, F., & Carraro, G. (2006). Architecture strategies for catching the long tail. Microsoft Corporation, MSDN Library, 1-14.
3. Microsoft Learn (2025). Architect multitenant solutions on Azure: Considerations and Approaches. Azure Architecture Center. [Online].
4. Golding, T. (2022). SaaS Architecture Fundamentals. Amazon Web Services (AWS) Whitepaper.
5. Golding, T. (2024). Building Multi-Tenant SaaS Architectures: Principles, Practices, and Patterns. O’Reilly Media.
6. Mell, P., & Grance, T. (2011). The NIST Definition of Cloud Computing. National Institute of Standards and Technology, Special Publication 800-145.
7. Bezemer, C. P., & Zaidman, A. (2010). Multi-tenant SaaS applications: maintenance dream or nightmare?. In Proceedings of the Joint ERCIM Workshop on Software Evolution (EVOL) and International Workshop on Principles of Software Evolution (IWPSE) (pp. 88-92). ACM.
8. Copi, I. M., Cohen, C., & Flage, D. E. (1972/2007). Introduction to Logic. Macmillan / Pearson.
9. Smith, M. A., & Kumar, R. L. (2004). A theory of application service provider (ASP) use from a client perspective. Information & Management, 41(8), 977-1002.
10. Wilkes, M. V. (1975). Time-sharing computer systems. Elsevier Science Inc.
