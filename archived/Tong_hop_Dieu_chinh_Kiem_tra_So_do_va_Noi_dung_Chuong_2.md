# **CHƯƠNG 2: KIẾN TRÚC HỆ THỐNG ĐA THUÊ BAO (MULTI-TENANT ARCHITECTURE)**

Nếu như Chương 1 đã thiết lập nền tảng nhận thức luận và hình thức hóa bộ khung lý thuyết về Đa thuê bao (*Multi-Tenancy*) — đi từ động lực kinh tế của quy luật ghép kênh thống kê, chuẩn hóa bộ ba khái niệm *Tenant – Service – Instance*, năm đặc trưng kiến trúc cốt lõi, đến việc tái định nghĩa ngăn xếp hệ thống 9 tầng Cloud-Native (*Figure 2 mới*) cùng khái niệm *Ranh giới Thuê bao (Tenant Boundary)* trên bốn chiều không gian (B1–B4) — thì câu hỏi trọng tâm tiếp theo đặt ra cho người kiến trúc sư hệ thống là: **Làm thế nào để chuyển hóa các mô hình khái niệm trừu tượng đó thành một cấu trúc hệ thống phần mềm cụ thể, có khả năng vận hành ổn định, bảo mật và co giãn dưới tải thực tế?**

Trong thực tiễn kỹ thuật phần mềm hiện đại, không tồn tại một "công thức đa thuê bao vạn năng" duy nhất cho mọi bài toán. Việc xây dựng một nền tảng SaaS đa thuê bao thực chất là quá trình giải một bài toán tối ưu hóa đa mục tiêu: vừa phải nén chi phí hạ tầng biên ($\delta$) xuống mức thấp nhất thông qua việc gộp chung tài nguyên, vừa phải kiểm soát nghiêm ngặt nguy cơ rò rỉ dữ liệu chéo (*cross-tenant data leakage*) và hiệu ứng láng giềng ồn ào (*noisy neighbor*) thông qua các vách ngăn cô lập phù hợp. Chương 2 đóng vai trò là cầu nối kiến trúc trọng yếu giữa cơ sở lý thuyết (Chương 1) và thiết kế – hiện thực hóa hệ thống thực nghiệm (Chương 3). Nội dung của chương được cấu trúc theo tiến trình diễn dịch từ tổng thể đến chi tiết: khởi đầu bằng việc xác lập bản chất thiết kế, cặp phạm trù *Tách – Gộp*, hai trục phân tích và bản thiết kế tổng thể tham chiếu (*Master Blueprint*) (Mục 2.1); phân tích bốn mô hình triển khai kinh điển *Silo, Pool, Bridge, Hybrid* (Mục 2.2); giải phẫu chiến lược **Tách (Isolation)** và **Gộp (Sharing)** gắn liền với các chiều ranh giới xuyên suốt từng tầng trong ngăn xếp 9 tầng (Mục 2.3); tổng hợp các kịch bản phối hợp đa tầng điển hình trong công nghiệp (Mục 2.4); đi sâu vào bốn cơ chế kỹ thuật cốt lõi vận hành bên trong tiến trình lúc chạy (Mục 2.5); và cuối cùng đúc kết thành khung quyết định lựa chọn kiến trúc tổng quát cùng cấu hình định vị cho nền tảng SaaS Kanban của đề tài (Mục 2.6).

---

## **2.1. Tổng quan Kiến trúc Hệ thống Đa thuê bao**

Để tránh việc tiếp cận kiến trúc đa thuê bao như một tập hợp rời rạc các thủ thuật cấu hình cơ sở dữ liệu hay định tuyến mạng, trước hết cần xác lập một hệ quy chiếu thiết kế thống nhất. Mục này kế thừa trực tiếp các tiền đề lý thuyết của Chương 1 để làm rõ bản chất thiết kế của hệ thống đa thuê bao, định nghĩa tường minh cặp khái niệm hạt nhân **Tách – Gộp**, giải thích lý do hình thành hai câu hỏi thiết kế cùng hai trục phân tích xuyên suốt (Mục 2.1.1), và trên cơ sở đó thiết lập Sơ đồ Kiến trúc Tổng thể Tham chiếu (*Master Blueprint*) cùng hệ quy ước biểu diễn nhất quán cho toàn bộ chương (Mục 2.1.2).

### **2.1.1. Bản chất Thiết kế Hệ thống Đa thuê bao, Khái niệm Tách – Gộp và Hai Trục Phân tích Kiến trúc**

Ở cấp độ khái niệm nền tảng (Chương 1, Mục 2.3), Đa thuê bao đã được định nghĩa là một thuộc tính kiến trúc cho phép một hoặc nhiều thực thể vận hành (*Instances*) của cùng một dịch vụ (*Service*) phục vụ đồng thời nhiều đơn vị thuê bao (*Tenants*) với sự cô lập logic tường minh. Tuy nhiên, khi chuyển từ bình diện nhận thức luận sang bình diện **Thiết kế Kiến trúc Hệ thống (System Architecture Design)**, Đa thuê bao không còn là một nhãn phân loại tĩnh (có hoặc không có đa thuê bao), mà trở thành **một tập hợp các quyết định tổ chức cấu trúc tài nguyên và cơ chế kiểm soát lúc chạy (*runtime control mechanisms*) nhằm điều phối sự tương tác giữa nhiều thuê bao trên cùng một hệ thống phân tán**.

Sự chuyển dịch từ định nghĩa lý thuyết sang bài toán thiết kế hệ thống không phải là sự áp đặt ngẫu nhiên, mà được suy diễn trực tiếp từ **ba luận cứ nền tảng đã được chứng minh tại Chương 1**:
* *Luận cứ thứ nhất – Từ cấu trúc ánh xạ Nhiều–Một của bộ ba Tenant – Service – Instance và định danh hai lớp ($\text{Tenant ID} \to \text{User ID}$) (Chương 1, Mục 1.2 & 1.4):* Trong mô hình Đa thuê bao, nhiều tổ chức độc lập cùng hội tụ vào một tập hữu hạn các thực thể đang chạy. Hệ quả tất yếu là một máy chủ vật lý, một tiến trình ứng dụng hay một kết nối cơ sở dữ liệu không còn thuộc sở hữu độc quyền của riêng bất kỳ khách hàng nào. Nếu hệ thống không có cơ chế tách rời định danh tổ chức khỏi định danh tài nguyên vật lý, các luồng thực thi đồng thời sẽ lập tức giao thoa và làm nhiễm bẩn dữ liệu của nhau.
* *Luận cứ thứ hai – Từ hàm Tổng chi phí sở hữu $C_{\text{MT}}(N) = C_{\text{fixed}} + \delta \times N$ và "Nghịch lý của Tính Trong suốt" (Chương 1, Mục 1.1 & 1.5.4):* Động lực kinh tế của SaaS đòi hỏi phải hợp nhất tài nguyên giữa các thuê bao để tận dụng nguyên lý *ghép kênh thống kê (Statistical Multiplexing)* nhằm kéo giảm chi phí biên $\delta$. Thế nhưng, việc chia sẻ tài nguyên vật lý lại làm nảy sinh nguy cơ một thuê bao chiếm dụng đột biến tài nguyên làm suy giảm chất lượng dịch vụ của thuê bao khác (*Noisy Neighbor*) hoặc truy cập trái phép dữ liệu chéo. Mâu thuẫn nội tại này buộc người kiến trúc sư không thể chọn cách "chia sẻ mù quáng" hay "cô lập cực đoan", mà phải tính toán mức độ chia sẻ và cô lập phù hợp tại từng vị trí của hệ thống.
* *Luận cứ thứ ba – Từ mô hình trưởng thành Cấp độ 3–4 của Chong & Carraro và đặc trưng Tùy biến động dựa trên Siêu dữ liệu (Chương 1, Mục 1.1.2 & 1.3.2):* Điều kiện tiên quyết để một nền tảng SaaS mở rộng quy mô lên hàng nghìn khách hàng mà không sụp đổ vì chi phí bảo trì là tính bất biến của **một bộ mã nguồn duy nhất (*Single Codebase*)**. Tuy nhiên, trên cùng bộ mã nguồn chuẩn hóa đó, hệ thống vẫn phải đáp ứng nhu cầu cá biệt hóa về giao diện, quy trình, hạn mức gói cước (*Free / Pro / Enterprise*) và quyền hạn cho từng thuê bao.

Chính từ ba luận cứ lý thuyết tất yếu trên của Chương 1, bản chất thiết kế của một kiến trúc đa thuê bao xoay quanh **ba trụ cột kỹ thuật không thể tách rời**:
1. **Sự phân tách giữa Định danh Tổ chức và Tài nguyên Vật lý:** Trong kiến trúc đơn thuê bao truyền thống, định danh của một khách hàng gắn chặt một-một với một địa chỉ máy chủ, một tiến trình hoặc một cơ sở dữ liệu vật lý. Ngược lại, trong kiến trúc đa thuê bao, ranh giới tổ chức được trừu tượng hóa thành một **Ngữ cảnh Thuê bao (*Tenant Context*)** — một siêu dữ liệu định danh di chuyển cùng mọi yêu cầu (*request*), mọi truy vấn dữ liệu và mọi tác vụ nền trong suốt vòng đời xử lý.
2. **Sự điều tiết linh hoạt giữa Chia sẻ (*Sharing*) và Cô lập (*Isolation*):** Kiến trúc đa thuê bao hiện đại không đồng nghĩa với việc buộc mọi tầng hệ thống phải dùng chung 100%. Thay vào đó, nó cho phép người kiến trúc sư chủ động lựa chọn những tầng nào nên hợp nhất để tối ưu Tổng chi phí sở hữu (TCO) và quản trị vòng đời (CI/CD), đồng thời những tầng nào cần phân tách vật lý hoặc logic để bảo toàn tính toàn vẹn dữ liệu và cam kết chất lượng dịch vụ (SLA).
3. **Tính thích nghi động dựa trên Siêu dữ liệu (*Metadata-Driven Adaptability*):** Cùng một bộ mã nguồn (*Single Codebase*) và cùng một cụm thực thể đang chạy phải có khả năng tự biến đổi hành vi, giao diện, hạn mức tài nguyên (*quota*) và quyền truy cập tính năng theo đúng ngữ cảnh của thuê bao đang gọi mà không cần biên dịch lại hay phân nhánh mã nguồn.

Để cụ thể hóa trụ cột thứ hai về sự điều tiết giữa Chia sẻ và Cô lập thành ngôn ngữ thiết kế kiến trúc chuẩn mực, cần định nghĩa rõ cặp phạm trù đối lập nhưng thống nhất xuyên suốt toàn bộ Chương 2 là **Tách (*Isolation / Dedicated Allocation*)** và **Gộp (*Sharing / Pooled Allocation*)**:
* **Khái niệm "Tách" (*Isolation / Dedicated*):** Là chiến lược thiết kế trong đó mỗi thuê bao (hoặc một nhóm thuê bao được phân vùng riêng) được cấp phát một thực thể tài nguyên độc lập tại tầng kiến trúc đang xét — chẳng hạn một máy chủ ảo riêng, một mạng VPC riêng, một tiến trình ứng dụng riêng, một cơ sở dữ liệu riêng hoặc một không gian tên lược đồ (`schema`) riêng. Chiếu theo lý thuyết của Chương 1 (Mục 1.5.4), quyết định **Tách** chính là việc lựa chọn **Ranh giới Thuê bao có độ dày lớn (từ Cấp độ 3 đến Cấp độ 5 trên Phổ độ dày ranh giới)**. Khi Tách, sự cô lập giữa các thuê bao được đảm bảo trực tiếp bởi ranh giới vật lý, nhân hệ điều hành hoặc cấu trúc không gian tên của hệ quản trị, giúp thu hẹp tối đa bán kính ảnh hưởng sự cố (*Blast Radius*), nhưng phải đánh đổi bằng chi phí hạ tầng tăng tuyến tính và giảm hiệu suất sử dụng tài nguyên nhàn rỗi.
* **Khái niệm "Gộp" (*Sharing / Pooled*):** Là chiến lược thiết kế trong đó nhiều (hoặc toàn bộ) thuê bao cùng chia sẻ và vận hành đan xen trên một thực thể tài nguyên duy nhất tại tầng kiến trúc đang xét — chẳng hạn cùng một cụm điều phối Kubernetes, cùng một tiến trình ứng dụng không trạng thái (*Stateless Process*), cùng một cụm bộ nhớ đệm Redis hoặc cùng một bảng dữ liệu vật lý (*Shared Table*). Chiếu theo Chương 1, quyết định **Gộp** chính là việc rút mỏng vách ngăn vật lý xuống thành **Ranh giới Thuê bao logic mềm (Cấp độ 1 và Cấp độ 2 trên Phổ độ dày ranh giới)**. Khi Gộp, hệ thống đạt được hiệu quả ghép kênh thống kê cao nhất và chi phí biên $\delta$ thấp nhất, nhưng toàn bộ gánh nặng ngăn chặn truy cập chéo và tranh chấp tài nguyên được dồn lên vai các cơ chế kiểm soát bằng phần mềm lúc chạy.

Khi đặt cặp khái niệm **Tách – Gộp** này vào mô hình **Ngăn xếp Hệ thống Đa thuê bao Cloud-Native 9 tầng** và **Bốn chiều Ranh giới Thuê bao (B1 – Nhận diện, B2 – Dữ liệu, B3 – Hiệu năng, B4 – Cấu hình)** đã xác lập ở Chương 1 (Mục 1.5.3 & 1.5.4), chúng ta nhận thấy một thực tế kỹ thuật quan trọng: 9 tầng của ngăn xếp không hề đồng nhất về bản chất vận hành. Các tầng phía dưới (Tầng 1–3) mang bản chất hạ tầng vật lý/ảo hóa; các tầng giữa (Tầng 4–6) mang bản chất lưu trữ có trạng thái bền vững (*Stateful Persistence*) — nơi dữ liệu của khách hàng cư trú lâu dài và nhạy cảm nhất với rủi ro lộ lọt; trong khi các tầng phía trên (Tầng 7–9) lại mang bản chất xử lý luồng yêu cầu không trạng thái (*Stateless Compute*) và điều khiển logic nghiệp vụ. Hơn nữa, theo *Quy luật Bảo toàn Trách nhiệm Cô lập* đã chứng minh ở Chương 1, bất cứ khi nào người kiến trúc sư quyết định tháo bỏ vách ngăn vật lý để **Gộp** tài nguyên tại một tầng $L_i$, trách nhiệm bảo vệ ranh giới thuê bao tại tầng đó không tự động mất đi mà bắt buộc phải được bù đắp bằng một cơ chế kiểm soát phần mềm tương đương.

Chính vì sự khác biệt bản chất giữa các tầng và quy luật bảo toàn trách nhiệm cô lập nói trên, bài toán thiết kế kiến trúc đa thuê bao tại mỗi tầng thành phần $L_i$ ($i \in \{1..9\}$) tất yếu quy về việc trả lời tuần tự **hai câu hỏi thiết kế cốt lõi**:
* **Câu hỏi thứ nhất – Quyết định Cấu trúc Hình thái (Structural Topology Decision): *Tại tầng $L_i$, tài nguyên của các thuê bao nên được Tách biệt (Dedicated) hay Gộp chung (Pooled)?***
  *Lý do phải đặt câu hỏi này:* Đây là câu hỏi xác lập hình thái không gian và định vị **độ dày ranh giới thuê bao** tại tầng $L_i$. Trả lời câu hỏi này giúp người thiết kế giải quyết trực tiếp bài toán đánh đổi kinh tế – kỹ thuật tại đúng tầng đó: liệu lợi ích tiết kiệm chi phí TCO và sự tiện lợi vận hành khi *Gộp* tại tầng $L_i$ có xứng đáng với rủi ro mở rộng bán kính sự cố hay không, hay các ràng buộc pháp lý và cam kết SLA bắt buộc phải *Tách* riêng tài nguyên ở tầng này?
* **Câu hỏi thứ hai – Cơ chế Thực thi Vách ngăn (Boundary Enforcement Mechanism): *Nếu tầng $L_i$ được quyết định Gộp chung, hệ thống phải triển khai cơ chế kỹ thuật cụ thể nào tại tầng đó để bảo vệ các thuộc tính bất biến của Ranh giới Thuê bao trên cả 4 chiều B1, B2, B3 và B4?***
  *Lý do phải đặt câu hỏi này:* Đây là câu hỏi xác lập **điều kiện biên an toàn về mặt vận hành**. Quyết định *Gộp* ở Câu hỏi thứ nhất mới chỉ tạo ra sự chia sẻ tài nguyên (tương đương mô hình *Multi-User* thông thường nếu thiếu vách ngăn); chính câu trả lời ở Câu hỏi thứ hai mới biến sự chia sẻ đó thành kiến trúc *Multi-Tenant* an toàn. Nếu người thiết kế chọn *Gộp* bảng cơ sở dữ liệu (Tầng 6) mà không trả lời được cơ chế bảo vệ Chiều B2 (như *Row-Level Security*), hoặc chọn *Gộp* tiến trình ứng dụng (Tầng 8) mà không trả lời được cơ chế bảo vệ Chiều B1 và B3 (như cô lập `TenantContext` theo luồng và kiểm soát bộ nhớ Heap), hệ thống chắc chắn sẽ gặp sự cố rò rỉ dữ liệu hoặc tê liệt dây chuyền khi vận hành thực tế.

Tuy nhiên, nếu người kiến trúc sư chỉ cầm hai câu hỏi trên và áp dụng một cách cơ học vào từng tầng riêng lẻ trong 9 tầng, không gian thiết kế sẽ bùng nổ tổ hợp ($2^9 = 512$ phương án kết hợp Tách – Gộp lý thuyết), khiến quá trình phân tích dễ rơi vào tình trạng thấy cây mà không thấy rừng. Ngược lại, nếu chỉ nhìn hệ thống như một khối nguyên tảng từ bên ngoài theo các tên gọi tổng quát (như *Silo* hay *Pool*), người thiết kế lại không có công cụ đủ chi tiết để cấu hình từng tầng thành phần như bộ nhớ đệm, hàng đợi tin nhắn hay lưu trữ tệp đính kèm. Để khắc phục sự phiến diện của cả hai cách tiếp cận đơn lẻ đó, Chương 2 thiết lập **hai trục phân tích xuyên suốt, trực giao nhưng bổ trợ chặt chẽ cho nhau**:
* **Trục phân tích thứ nhất – Góc nhìn Vĩ mô theo Mô hình Triển khai Tổng thể (*Macro Deployment Topology – trình bày tại Mục 2.2*):** Khảo sát hệ thống ở mức độ tổng thể để nhận diện bốn hình thái kiến trúc chuẩn mực trong công nghiệp: **Silo** (cô lập toàn phần các cụm tài nguyên theo thuê bao), **Pool** (gộp chung toàn phần trên một cụm tài nguyên), **Bridge** (gộp tầng tính toán nhưng tách tầng dữ liệu) và **Hybrid** (vận hành song song nhiều hình thái theo phân khúc khách hàng). Trục vĩ mô này cung cấp kim chỉ nam chiến lược gắn liền với mô hình kinh doanh.
* **Trục phân tích thứ hai – Góc nhìn Vi mô theo Chiến lược Tách – Gộp qua Từng Tầng Ngăn xếp (*Micro Layer-by-Layer Isolation vs. Sharing – trình bày tại Mục 2.3 và Mục 2.4*):** Đi sâu giải phẫu từng tầng từ Tầng 1 (Phần cứng vật lý) lên đến Tầng 9 (Mã nguồn & Cấu hình logic), trả lời trực tiếp hai câu hỏi thiết kế tại mỗi tầng và ánh xạ vào 4 chiều ranh giới B1–B4. Trục vi mô này làm sáng tỏ rằng các mô hình *Silo, Pool, Bridge, Hybrid* ở Trục 1 thực chất chính là các nghiệm hội tụ điển hình của ma trận lựa chọn Tách – Gộp trên 9 tầng ở Trục 2.

---

### **2.1.2. Sơ đồ Kiến trúc Tổng thể Tham chiếu (*Master Blueprint*) và Hệ Quy ước Biểu diễn Nhất quán**

Từ bản chất thiết kế, cặp khái niệm **Tách – Gộp** và hai trục phân tích đã xác lập tại Mục 2.1.1, **Hình 2.1** tổng hợp và trực quan hóa **Sơ đồ Kiến trúc Tổng thể Tham chiếu (*Master Blueprint*)** của hệ thống đa thuê bao 9 tầng. Sơ đồ này đóng vai trò là "bản đồ gốc" dẫn đường cho toàn bộ Chương 2, thể hiện rõ sự phân tách giữa hai phân vùng ngăn xếp (kế thừa từ Chương 1) và hai hướng chiến lược (**Hướng A – Chiến lược Tách / Isolation** và **Hướng B – Chiến lược Gộp / Sharing**) tác động vào từng tầng thành phần.

![Hình 2.1: Sơ đồ Kiến trúc Tổng thể Tham chiếu (Master Blueprint) 9 tầng và hai trục chiến lược Tách – Gộp](../diagrams/diagrams_C2/png/hinh_2_1_master_blueprint.drawio.png)

*Hình 2.1: Sơ đồ Kiến trúc Tổng thể Tham chiếu (Master Blueprint) 9 tầng và hai trục chiến lược Tách – Gộp. (Bản vẽ chuẩn hóa XML: [hinh_2_1_master_blueprint.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_1_master_blueprint.drawio))*

Để đảm bảo tính nhất quán tuyệt đối khi đọc, phân tích và đối chiếu toàn bộ hệ thống sơ đồ trong chương này (cũng như liên thông hoàn hảo với các sơ đồ của Chương 1), nghiên cứu xác lập **Hệ quy ước biểu diễn đồ họa hai cấp độ** như sau:

1. **Quy ước Cấp độ 1 – Phân vùng Ngăn xếp Hệ thống (Áp dụng trên *Master Blueprint* – Hình 2.1, kế thừa từ Hình 1.6b Chương 1):**
   * **Khung bao Phân vùng Nét liền (Tầng 4 đến Tầng 9 – *Tenant-Aware Stack*):** Biểu thị các tầng phần mềm và lưu trữ có nhận thức trực tiếp về ngữ cảnh thuê bao (`tenant_id`). Đây là không gian trọng tâm nơi phần mềm ứng dụng thực thi các cơ chế phân tách logic trên 4 chiều B1–B4.
   * **Khung bao Phân vùng Nét đứt (Tầng 1 đến Tầng 3 – *Underlying Infrastructure Stack*):** Biểu thị các tầng hạ tầng đám mây nền tảng (Vật lý, Mạng, Ảo hóa/Container) cung cấp năng lực tính toán và cô lập ở cấp độ hệ thống bên dưới.

2. **Quy ước Cấp độ 2 – Hình thái Tài nguyên Tách và Gộp (Áp dụng xuyên suốt trên các sơ đồ Topology, Zoom-in và Kịch bản từ Hình 2.2 đến Hình 2.12):**
   * **Khung thành phần Nét liền (Solid Border Container – thường tô nền xanh lá hoặc xanh dương):** Biểu thị **Phân vùng Tài nguyên Gộp / Dùng chung (*Shared / Pooled Zone*)**, nơi nhiều thuê bao cùng chia sẻ một thực thể vận hành, một bộ nhớ đệm hoặc một cơ sở dữ liệu vật lý.
   * **Khung thành phần Nét đứt (Dashed Border Container – thường tô nền đỏ, tím hoặc cam):** Biểu thị **Phạm vi Tài nguyên hoặc Không gian tên Tách biệt / Dành riêng (*Dedicated Silo / Isolated Schema / Thread-local Context / Cell Scope*)** được đóng khung độc lập cho từng thuê bao hoặc từng nhóm thuê bao xác định.
   * **Màu sắc Định danh Luồng Thuê bao:** Xuyên suốt các sơ đồ, **Màu Xanh dương (`#1565C0`)** đại diện cho luồng yêu cầu và tài nguyên của *Tenant A (hoặc Tenant Alpha)*; **Màu Tím (`#6A1B9A`)** đại diện cho *Tenant B (hoặc Tenant Beta)*; **Màu Xanh lá (`#2E7D32`)** đại diện cho các thành phần xử lý gộp (*Pool*) và kiểm soát hợp lệ; **Màu Vàng cam (`#E65100`)** đại diện cho các bộ định tuyến (*Router*), đánh giá cờ tính năng (*Feature Flags*) và bộ lọc *RLS Engine*.

> **Bàn luận học thuật:** Việc phân định rõ hai cấp độ quy ước trên mang ý nghĩa phương pháp luận rất quan trọng. Ở góc nhìn giải phẫu ngăn xếp (Hình 2.1), đường nét liền/nét đứt trả lời câu hỏi *"Tầng này có nhận thức trực tiếp khái niệm thuê bao ở cấp độ phần mềm hay không?"*. Trong khi đó, ở góc nhìn hình thái triển khai (Hình 2.2 – Hình 2.12), đường nét liền/nét đứt trả lời câu hỏi *"Khối tài nguyên này đang được Gộp chung trong một bể thống nhất hay đang được khoanh vùng Tách biệt cho từng thuê bao?"*. Nhờ sự thống nhất này, người đọc có thể nhận diện tức thì cấu trúc cô lập của bất kỳ sơ đồ kiến trúc nào chỉ bằng trực quan thị giác.

---

## **2.2. Các Mô hình Triển khai Kiến trúc Đa thuê bao Kinh điển**

Từ bản thiết kế tham chiếu tổng thể tại Mục 2.1, khi xét hệ thống trên Trục phân tích thứ nhất (Góc nhìn vĩ mô theo hình thái triển khai tổng thể), tài liệu kiến trúc công nghiệp và học thuật — tiêu biểu là khung tham chiếu *AWS SaaS Lens* (AWS, 2024), *Microsoft Azure Multi-Tenant Architecture* (Microsoft, 2024) và các nghiên cứu của Chong & Carraro (2006), Kabbedijk et al. (2015) — phân loại kiến trúc đa thuê bao thành bốn mô hình kinh điển: **Silo**, **Pool**, **Bridge** và **Hybrid**. Mục này đi sâu phân tích cấu trúc, cơ chế vận hành và sự đánh đổi của từng mô hình.

### **2.2.1. Mô hình *Silo* (Cô lập Toàn phần theo Thuê bao)**

Trong mô hình **Silo** (còn gọi là *Full-Stack Isolation* ở cấp độ triển khai), mỗi thuê bao được cấp phát một ngăn xếp tài nguyên thực thi và lưu trữ hoàn toàn riêng biệt (dành riêng từ tầng thực thể ứng dụng, cơ sở dữ liệu cho tới mạng ảo hoặc máy chủ ảo). Điểm cốt lõi giúp phân biệt một hệ thống **SaaS theo mô hình Silo** với mô hình **Đơn thuê bao truyền thống (Single-Tenant / On-Premises)** hay mô hình **ASP thập niên 1990** (đã phân tích tại Mục 1.1 và Mục 4.2 của Chương 1) nằm ở **Mặt phẳng Quản trị Tập trung (*Unified Control Plane*)**: toàn bộ các cụm Silo đều chạy cùng một phiên bản mã nguồn chuẩn (*Single Codebase*), được khởi tạo tự động (*Automated Provisioning*), giám sát tập trung và cập nhật đồng loạt thông qua một đường ống CI/CD duy nhất mà không có sự can thiệp thủ công vào từng máy chủ.

![Hình 2.2: Kiến trúc Mô hình Silo (Cô lập hoàn toàn tài nguyên Mặt phẳng Ứng dụng theo từng Thuê bao dưới sự điều phối của Control Plane chung)](../diagrams/diagrams_C2/png/hinh_2_2_silo_model.drawio.png)

*Hình 2.2: Kiến trúc Mô hình Silo (Cô lập hoàn toàn tài nguyên Mặt phẳng Ứng dụng theo từng Thuê bao dưới sự điều phối của Control Plane chung). (Bản vẽ chuẩn hóa XML: [hinh_2_2_silo_model.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_2_silo_model.drawio))*

Quan sát **Hình 2.2**, các yêu cầu từ *Tenant A* và *Tenant B* sau khi đi qua cổng định tuyến biên (*Ingress / Routing Gateway* thuộc tầng dùng chung) sẽ được điều hướng thẳng về hai phân vùng vật lý/ảo hóa độc lập (biểu diễn bằng hai khung nét đứt riêng biệt): *Tenant A* sở hữu riêng `Instance A` và `Database A` trên `Hạ tầng A (VPC/VM A)`, trong khi *Tenant B* sở hữu riêng `Instance B` và `Database B` trên `Hạ tầng B (VPC/VM B)`.

* **Ưu điểm cốt lõi:** Đạt mức độ cô lập cao nhất (tương ứng Cấp độ 4–5 trên Phổ độ dày ranh giới Chương 1); triệt tiêu hoàn toàn nguy cơ rò rỉ dữ liệu chéo ở tầng ứng dụng/CSDL và loại bỏ 100% hiện tượng *láng giềng ồn ào (Noisy Neighbor)*; đáp ứng dễ dàng các tiêu chuẩn pháp lý khắt khe (HIPAA, PCI-DSS, dữ liệu tài chính/chính phủ) và cho phép hạch toán chi phí hạ tầng (*Cost Attribution*) chính xác tuyệt đối theo hóa đơn đám mây của từng cụm Silo.
* **Nhược điểm và Giới hạn:** Đánh mất lợi thế *ghép kênh thống kê (Statistical Multiplexing)* ở tầng thực thi và dữ liệu; chi phí hạ tầng tăng tuyến tính theo số lượng thuê bao ($C \approx N \times C_{\text{unit}}$) do tài nguyên dư thừa khi thuê bao nhàn rỗi không thể san sẻ cho thuê bao khác; khi quy mô $N$ vượt ngưỡng hàng trăm hoặc hàng nghìn thuê bao, việc quản trị trạng thái di trú lược đồ (*Schema Migration*) và điều phối hàng nghìn cụm Silo trở thành gánh nặng vận hành khổng lồ.

### **2.2.2. Mô hình *Pool* (Chia sẻ Toàn phần trên Ranh giới Logic)**

Đứng ở cực đối diện với *Silo* là mô hình **Pool** (*Full-Stack Sharing*). Trong mô hình này, toàn bộ các thuê bao cùng chia sẻ chung một tập hợp tài nguyên hạ tầng, cùng một cụm thực thể ứng dụng (*Shared Application Instances*), cùng một hệ thống bộ nhớ đệm (*Shared Cache*) và cùng lưu trữ dữ liệu trong các bảng dùng chung (*Shared Tables*) của một cơ sở dữ liệu thống nhất. Ranh giới giữa các thuê bao trong mô hình *Pool* hoàn toàn là **ranh giới logic mềm** (tương ứng Cấp độ 1–2 trên Phổ độ dày ranh giới), được duy trì liên tục bởi phần mềm thông qua khóa định danh `tenant_id`.

![Hình 2.3: Kiến trúc Mô hình Pool (Chia sẻ toàn diện tài nguyên tính toán và lưu trữ với vách ngăn cô lập logic)](../diagrams/diagrams_C2/png/hinh_2_3_pool_model.drawio.png)

*Hình 2.3: Kiến trúc Mô hình Pool (Chia sẻ toàn diện tài nguyên tính toán và lưu trữ với vách ngăn cô lập logic). (Bản vẽ chuẩn hóa XML: [hinh_2_3_pool_model.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_3_pool_model.drawio))*

Như minh họa trên **Hình 2.3**, toàn bộ các thành phần từ `API Gateway`, `Shared App Instances`, `Shared Cache` cho đến `Shared DB (RLS)` đều nằm gọn trong một khung nét liền duy nhất (*Hệ thống Dùng chung Toàn diện*). Luồng yêu cầu của *Tenant A* và *Tenant B* đan xen trực tiếp vào nhau bên trong cùng các tiến trình xử lý và chỉ được phân biệt nhờ ngữ cảnh `tenant_id` đi kèm.

* **Ưu điểm cốt lõi:** Phát huy tối đa hiệu quả kinh tế theo quy mô (*Economies of Scale*) và nguyên lý ghép kênh thống kê; chi phí biên $\delta$ khi đón thêm một thuê bao mới tiến sát về mức tối thiểu (chỉ tốn thêm vài dòng bản ghi siêu dữ liệu); thời gian khởi tạo thuê bao mới (*Onboarding*) diễn ra tức thì (tính bằng mili-giây); việc triển khai bản vá lỗi hay nâng cấp lược đồ chỉ cần thực hiện một lần duy nhất trên cụm tài nguyên chung.
* **Nhược điểm và Rủi ro:** Bán kính ảnh hưởng sự cố (*Blast Radius*) rộng — một lỗi cấu hình bảo mật ở tầng ứng dụng hoặc một câu truy vấn thiếu điều kiện lọc `tenant_id` có thể dẫn tới thảm họa lộ lọt dữ liệu toàn hệ thống; rất nhạy cảm với hiện tượng *Noisy Neighbor* khi một thuê bao phát sinh đột biến tải làm cạn kiệt CPU, bộ nhớ đệm hoặc *Connection Pool* chung; đòi hỏi kỹ thuật thiết kế phần mềm ở trình độ cao (bắt buộc phải có cơ chế bảo vệ chiều sâu như *Row-Level Security*, *Rate Limiting* theo thuê bao và *Two-Tier Tenant-Aware Caching*).

### **2.2.3. Mô hình *Bridge* (Lai ghép theo Chiều dọc Ngăn xếp: Gộp Tính toán – Tách Dữ liệu)**

Trong nhiều hệ thống SaaS B2B thực tế, việc áp dụng *Silo* toàn phần gây lãng phí quá lớn ở tầng tính toán (do các tiến trình Web/API không lưu trạng thái – *stateless* – rất dễ chia sẻ), nhưng việc áp dụng *Pool* toàn phần tới tận bảng dữ liệu lại vấp phải rào cản tâm lý và yêu cầu kiểm toán dữ liệu của khách hàng doanh nghiệp. Để hóa giải mâu thuẫn này, mô hình **Bridge** (còn gọi là *Shared Compute – Isolated Data*) ra đời như một điểm cân bằng theo chiều dọc của ngăn xếp.

Bản chất của mô hình *Bridge* là: **Gộp chung (Pool) toàn bộ các tầng không trạng thái ở phía trên (Tầng 7 Middleware, Tầng 8–9 Application & Codebase), nhưng Tách biệt (Silo) ở tầng lưu trữ dữ liệu (Tầng 5–6 Database/Schema)**.

![Hình 2.4: Kiến trúc Mô hình Bridge (Chia sẻ tầng thực thi ứng dụng không trạng thái và Phân tách không gian dữ liệu theo Thuê bao)](../diagrams/diagrams_C2/png/hinh_2_4_bridge_model.drawio.png)

*Hình 2.4: Kiến trúc Mô hình Bridge (Chia sẻ tầng thực thi ứng dụng không trạng thái và Phân tách không gian dữ liệu theo Thuê bao). (Bản vẽ chuẩn hóa XML: [hinh_2_4_bridge_model.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_4_bridge_model.drawio))*

**Hình 2.4** minh họa biến thể phổ biến nhất của mô hình *Bridge* trên hệ quản trị CSDL quan hệ (như PostgreSQL): cả *Tenant A* và *Tenant B* đều đi qua cùng một `API Gateway` và được xử lý bởi cùng một cụm `Shared App Instances` (khung nét liền). Tuy nhiên, khi kết nối xuống tầng dữ liệu, tiến trình ứng dụng sử dụng bộ định tuyến ngữ cảnh (*Data Access Router*) để chuyển hướng câu lệnh SQL (`BEGIN; SET LOCAL search_path TO tenant_a;`) vào các không gian tên lược đồ riêng biệt (`Schema A` và `Schema B` – biểu diễn bằng các khung nét đứt độc lập) hoặc các cơ sở dữ liệu riêng biệt của từng thuê bao.

* **Ưu điểm cốt lõi:** Kết hợp được tính kinh tế và sự gọn nhẹ trong vận hành CI/CD của tầng ứng dụng dùng chung với sự cô lập rõ ràng về mặt cấu trúc dữ liệu ở tầng dưới; cho phép sao lưu/khôi phục (*Backup/Restore*) dữ liệu theo từng thuê bao dễ dàng hơn nhiều so với bảng gộp *Shared-Table*; hỗ trợ tốt nhu cầu tùy biến cấu trúc bảng (*Custom Schema Extension*) cho từng khách hàng mà không làm phình bảng chung.
* **Nhược điểm và Giới hạn:** Tạo ra điểm nghẽn phức tạp tại tầng kết nối dữ liệu (đặc biệt khi tách thành các Database vật lý riêng khiến hệ thống không thể chia sẻ *Connection Pool* hiệu quả); khi số lượng thuê bao $N$ lên tới hàng chục nghìn, việc duy trì hàng chục nghìn Schema trong một DBMS sẽ gây quá tải bộ nhớ siêu dữ liệu (*Catalog Bloat*) và kéo dài thời gian chạy *Migration* tuần tự.

### **2.2.4. Mô hình *Hybrid* (Phân tầng Hỗn hợp theo Phân khúc Thuê bao) và So sánh Tổng hợp**

Nếu mô hình *Bridge* là sự lai ghép **theo chiều dọc** (giữa các tầng trong cùng một luồng xử lý), thì mô hình **Hybrid** là sự lai ghép **theo chiều ngang** (giữa các phân khúc khách hàng khác nhau trên cùng một nền tảng SaaS). Trong thực tế thương mại của các nền tảng SaaS quy mô lớn (như Jira Cloud, Trello Enterprise, Slack hay Salesforce), tập khách hàng không bao giờ đồng nhất: có hàng chục nghìn khách hàng nhóm *Free / Pro / SMB* nhạy cảm về giá nhưng yêu cầu cô lập tiêu chuẩn, song song với một số lượng nhỏ khách hàng *Enterprise* sẵn sàng chi trả mức phí cao gấp hàng chục lần để đổi lấy cam kết cô lập tài nguyên vật lý và SLA riêng biệt.

Mô hình *Hybrid* giải quyết bài toán này bằng cách vận hành đồng thời cả phân vùng *Pool* (hoặc *Bridge*) và phân vùng *Silo* dưới sự điều phối thông minh của tầng định tuyến nhận thức gói cước (*Tier-Aware Routing Middleware*).

![Hình 2.5: Kiến trúc Mô hình Hybrid (Kết hợp phân vùng Pooled Tier cho thuê bao phổ thông và phân vùng Silo Tier cho thuê bao Enterprise)](../diagrams/diagrams_C2/png/hinh_2_5_hybrid_model.drawio.png)

*Hình 2.5: Kiến trúc Mô hình Hybrid (Kết hợp phân vùng Pooled Tier cho thuê bao phổ thông và phân vùng Silo Tier cho thuê bao Enterprise). (Bản vẽ chuẩn hóa XML: [hinh_2_5_hybrid_model.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_5_hybrid_model.drawio))*

Quan sát **Hình 2.5**, toàn bộ các thuê bao (`Tenant A - Free`, `Tenant B - Pro`, `Tenant C - Enterprise`) đều truy cập vào một điểm cuối dịch vụ thống nhất (`Unified Ingress & Tier-Aware Router`). Tại đây, hệ thống giải mã thông tin gói cước (`tier`) trong ngữ cảnh thuê bao:
* Các yêu cầu từ `Tenant A (Free)` và `Tenant B (Pro)` được điều hướng vào **Phân vùng Dùng chung (*Pooled Tier* – khung nét liền màu xanh lá)** sử dụng `Shared App` và `Shared DB (RLS)` để tối ưu chi phí vận hành.
* Các yêu cầu từ `Tenant C (Enterprise)` được định tuyến tách biệt sang **Phân vùng Dành riêng (*Silo Tier* – khung nét đứt màu đỏ)** gồm `Dedicated App C` và `Dedicated DB C` để đảm bảo hiệu năng và an toàn dữ liệu độc lập.

Để tổng kết trực quan bốn mô hình kinh điển trên, **Bảng 2.1** đối sánh toàn diện các đặc tính kỹ thuật và kinh tế của *Silo, Pool, Bridge* và *Hybrid* trên 6 chiều đánh giá cốt lõi.

*Bảng 2.1: Đối sánh tổng hợp bốn mô hình triển khai kiến trúc đa thuê bao kinh điển.*

| Tiêu chí Đối sánh | Mô hình **Silo** *(Full Isolation)* | Mô hình **Pool** *(Full Sharing)* | Mô hình **Bridge** *(Shared Compute, Isolated Data)* | Mô hình **Hybrid** *(Tier-Based Combination)* |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cấu trúc Chia sẻ vs. Cô lập** | Cô lập toàn phần từ tầng ứng dụng xuống tầng dữ liệu và hạ tầng mạng/máy chủ cho từng thuê bao. | Chia sẻ toàn phần từ tầng ứng dụng xuống tận bảng dữ liệu chung (*Shared-Table*). | Chia sẻ tầng tính toán/ứng dụng (Tầng 7–9); cô lập tầng dữ liệu theo Schema hoặc DB (Tầng 5–6). | Phân vùng *Pool/Bridge* cho thuê bao phổ thông (*Free/Pro*); phân vùng *Silo* cho thuê bao *Enterprise*. |
| **2. Hiệu quả Chi phí (TCO) & Kinh tế quy mô** | **Thấp nhất:** Chi phí tăng tuyến tính $O(N)$, không tận dụng được ghép kênh thống kê giữa các thuê bao. | **Cao nhất:** Chi phí biên $\delta \to \min$, tận dụng tối đa ghép kênh thống kê trên toàn ngăn xếp. | **Trung bình – Khá:** Tiết kiệm tốt chi phí tính toán (CPU/RAM App), tốn thêm chi phí quản lý dữ liệu riêng. | **Tối ưu theo doanh thu (FinOps):** Cân bằng chi phí biên thấp cho số đông với biên lợi nhuận cao từ gói VIP. |
| **3. Mức độ Cô lập & Rủi ro *Noisy Neighbor*** | **Rất cao (Cấp 4–5):** Bán kính sự cố đóng khung trong 1 thuê bao; miễn nhiễm *Noisy Neighbor*. | **Thấp – Trung bình (Cấp 1–2):** Bán kính sự cố rộng; bắt buộc phải có *RLS, Rate Limit, Quota* chặt chẽ. | **Khá (Cấp 2–3):** Dữ liệu được tách bạch cấu trúc, nhưng vẫn có thể tranh chấp CPU/RAM ở tầng App/DBMS. | **Thích ứng theo SLA:** Thuê bao *Enterprise* được miễn nhiễm *Noisy Neighbor*; thuê bao thường chịu kiểm soát *Quota*. |
| **4. Độ phức tạp Vận hành & Quản trị (Ops/CI-CD)** | **Rất phức tạp khi $N$ lớn:** Phải tự động hóa *IaC (Terraform/Helm)* để quản lý và nâng cấp $N$ cụm độc lập. | **Đơn giản nhất về triển khai:** Chỉ vận hành và nâng cấp 1 cụm duy nhất, nhưng phức tạp ở logic kiểm soát mã nguồn. | **Trung bình – Cao:** Triển khai App đơn giản (1 cụm), nhưng chạy *Schema Migration* phải lặp qua $N$ Schema/DB. | **Cao nhất về định tuyến:** Đòi hỏi *Control Plane* và *Tier-Aware Router* có khả năng điều phối đa hình thái và di trú thuê bao (*Tenant Migration*). |
| **5. Khả năng Mở rộng theo Số lượng Thuê bao ($N$)** | Kém (thường giới hạn ở $N$ từ vài chục đến vài trăm thuê bao lớn). | Xuất sắc (hỗ trợ từ hàng chục nghìn đến hàng triệu thuê bao nhỏ và vừa). | Trung bình (phù hợp với vài trăm đến vài nghìn thuê bao; bị giới hạn bởi *Catalog/Connection Pool*). | Rất linh hoạt (mở rộng hàng trăm nghìn thuê bao ở nhánh *Pool* và hàng trăm khách hàng lớn ở nhánh *Silo*). |
| **6. Phân khúc Khách hàng Phù hợp Điển hình** | Ngành tài chính, ngân hàng, y tế, chính phủ, tập đoàn lớn yêu cầu tuân thủ pháp lý nghiêm ngặt. | Nền tảng SaaS B2C/B2B2C, SMB, Startup, công cụ cộng tác nhóm (Kanban, CRM vừa và nhỏ). | Hệ thống ERP/HRM tầm trung cần tùy biến bảng dữ liệu hoặc yêu cầu trích xuất/sao lưu DB riêng. | Các nền tảng SaaS thương mại trưởng thành cung cấp bảng giá đa bậc (*Freemium $\to$ Pro $\to$ Enterprise*). |

> **Bàn luận chuyển tiếp:** Bốn mô hình *Silo, Pool, Bridge, Hybrid* ở Mục 2.2 cho chúng ta một cái nhìn tổng quan sắc nét ở cấp độ toàn hệ thống. Tuy nhiên, nếu chỉ dừng lại ở 4 nhãn phân loại vĩ mô này, người thiết kế sẽ lúng túng trước các câu hỏi vi mô như: *"Trong mô hình Pool, tầng lưu trữ tệp đính kèm (Object Storage) nên tách Bucket hay gộp Bucket? Trong mô hình Bridge, nên tách ở mức máy chủ DBMS, tách Database hay tách Schema? Tầng bộ nhớ đệm (Cache), hàng đợi tin nhắn (Message Queue) và tiến trình ứng dụng được bảo vệ trên những chiều ranh giới nào khi gộp chung?"*. Để trả lời thấu đáo những câu hỏi đó, chúng ta phải chuyển sang **Trục phân tích thứ hai**: giải phẫu chiến lược **Tách (Isolation)** và **Gộp (Sharing)** gắn liền với 4 chiều ranh giới thuê bao (B1–B4) qua từng tầng trong ngăn xếp 9 tầng tại Mục 2.3.

---

## **2.3. Phân tích Chiến lược Tách (Isolation) và Gộp (Sharing) qua Từng Tầng Ngăn xếp**

Bám sát mô hình **Ngăn xếp Hệ thống Đa thuê bao Cloud-Native 9 tầng** đã định nghĩa tại Chương 1 và bản thiết kế tham chiếu **Hình 2.1**, mục này tiến hành giải phẫu hệ thống theo hành trình đi từ đáy ngăn xếp lên đỉnh ngăn xếp (*Bottom-Up Architectural Anatomy*). Để đảm bảo mạch phân tích vừa liền lạc, giàu tính dẫn dắt học thuật, vừa giữ trọn độ sâu kỹ thuật, 9 tầng thành phần được tổ chức thành **5 cụm tầng chức năng nối tiếp nhau**: khởi đầu từ nền móng vật lý tại **Cụm Hạ tầng Đám mây (Tầng 1–3)**; bước lên ranh giới lưu trữ phi cấu trúc tại **Tầng Lưu trữ Đám mây (Tầng 4)**; đi vào trái tim dữ liệu có cấu trúc tại **Cụm Cơ sở Dữ liệu và Hệ Quản trị CSDL (Tầng 5–6)**; tiến lên trạm điều phối lưu lượng tại **Tầng Phần mềm Trung gian – Middleware (Tầng 7)**; và kết thúc ở đỉnh cao nhất của tư duy phần mềm tại **Cụm Thực thi Ứng dụng và Mã nguồn / Cấu hình Logic (Tầng 8–9)**.

Tại mỗi cụm tầng, nghiên cứu không chỉ đối sánh hai phương án **Tách** và **Gộp**, mà còn phân tích tường minh cách các quyết định tại tầng đó tác động và bảo vệ **bốn chiều của Ranh giới Thuê bao** đã xác lập ở Chương 1: **Chiều B1 (*Nhận diện & Xác thực*)**, **Chiều B2 (*Cô lập Dữ liệu*)**, **Chiều B3 (*Cô lập Hiệu năng*)** và **Chiều B4 (*Cô lập Cấu hình & Tùy biến*)**.

---

### **2.3.1. Tầng Hạ tầng Đám mây: Phần cứng Vật lý, Mạng và Ảo hóa / Container (Tầng 1 – 3)**

Mọi hệ thống phần mềm đám mây, dù được trừu tượng hóa cao đến đâu, suy cho cùng đều phải vận hành trên các vi mạch bán dẫn, đường truyền cáp quang và nhân hệ điều hành cụ thể. Do đó, hành trình giải phẫu ngăn xếp đa thuê bao bắt đầu từ **Phân vùng Hạ tầng Nền tảng** (khung nét đứt gồm Tầng 1, Tầng 2 và Tầng 3 trên **Hình 2.1**) — nơi thiết lập những vách ngăn vật lý và ảo hóa đầu tiên của hệ thống.

#### **2.3.1.1. Vị trí và Vai trò Nền móng trong Ngăn xếp**
Cụm hạ tầng nền tảng bao gồm ba lớp kế tiếp nhau: **Tầng 1 (*Physical Hardware*)** cung cấp năng lực tính toán và lưu trữ vật lý thô (máy chủ Bare-Metal, vi xử lý CPU, bộ nhớ RAM vật lý, ổ đĩa NVMe và thiết bị bảo mật phần cứng HSM); **Tầng 2 (*Network Infrastructure*)** kiến tạo không gian truyền thông (mạng ảo VPC, Subnet, bảng định tuyến, tường lửa WAF và bộ cân bằng tải L4/L7); và **Tầng 3 (*Virtualization & Container Runtime*)** trừu tượng hóa phần cứng vật lý thành các đơn vị tính toán linh hoạt thông qua trình quản lý máy ảo (*Hypervisor* như KVM, AWS Nitro) và nền tảng điều phối container (*Kubernetes Cluster / Containerd*). Dù không trực tiếp hiểu khái niệm `tenant_id` ở tầng nghiệp vụ, cụm 3 tầng này đóng vai trò là "móng nhà chịu lực", quyết định giới hạn trên của tính an toàn cấp nhân hệ điều hành (*kernel-level security*), độ trễ mạng và khả năng cô lập tài nguyên tính toán thô cho toàn bộ các tầng phần mềm phía trên.

#### **2.3.1.2. Phương án Tách (Dedicated Infrastructure / Network / Compute Isolation)**
Khi bài toán đặt nặng yêu cầu tuân thủ pháp lý tuyệt đối hoặc phục vụ các tập đoàn lớn không chấp nhận chia sẻ phần cứng, chiến lược **Tách** được triển khai xuyên suốt từ Tầng 1 lên Tầng 3 nhằm dựng lên những bức tường cô lập dày nhất:
* **Tại Tầng 1 (Tách Phần cứng Vật lý):** Thuê bao được cấp phát máy chủ vật lý chuyên dụng (*Bare-Metal Server* hoặc *AWS Dedicated Hosts*). Việc không chia sẻ chung tấm silicon của vi xử lý giúp đảm bảo bộ nhớ đệm phần cứng (CPU L1/L2/L3 Cache) và đường truyền bộ nhớ (*Memory Bus*) hoàn toàn thuộc về một tổ chức duy nhất, qua đó triệt tiêu tận gốc nguy cơ tấn công kênh kề cấp vi kiến trúc (*Hardware Side-Channel Attacks* như Spectre hay Meltdown).
* **Tại Tầng 2 (Tách Không gian Mạng):** Mỗi thuê bao được đóng gói trong một mạng đám mây riêng ảo hoàn toàn độc lập (*Dedicated VPC / VNet*) với dải địa chỉ IP riêng, cổng kết nối kênh thuê riêng (*VPN / AWS Direct Connect*) về trung tâm dữ liệu của khách hàng và bộ quy tắc tường lửa (*Security Groups / Network ACLs*) tách biệt.
* **Tại Tầng 3 (Tách Máy ảo và Cụm Điều phối Container):** Mỗi thuê bao sở hữu một cụm máy ảo riêng (*Dedicated VM Instances*), một cụm Kubernetes độc lập (*Cluster-per-Tenant*) hoặc tối thiểu là một nhóm nút máy chủ tính toán riêng (*Dedicated Node Pool* được khóa cứng bằng cơ chế `Taints` và `Tolerations` kết hợp với `Namespace` riêng trong Kubernetes).

#### **2.3.1.3. Phương án Gộp (Shared Infrastructure & Multi-Tenant Kubernetes Cluster)**
Ngược lại, đối với đại đa số các nền tảng SaaS hiện đại hướng tới hiệu quả kinh tế quy mô, việc cấp phát riêng máy chủ, mạng VPC và cụm Kubernetes cho từng khách hàng sẽ gây lãng phí tài nguyên trầm trọng (do tải thực tế của từng thuê bao thường dao động theo múi giờ và có nhiều khoảng nghỉ). Khi đó, chiến lược **Gộp** được áp dụng: hàng nghìn thuê bao cùng chia sẻ một hạ tầng đám mây công cộng (Tầng 1), cùng đi qua một mạng *Shared VPC* và bộ cân bằng tải chung (Tầng 2), và cùng thực thi trên một cụm *Shared Kubernetes Cluster* (Tầng 3).

Để phương án Gộp ở Tầng 1–3 không dẫn tới thảm họa một tiến trình bị tấn công chiếm quyền điều khiển máy chủ (*Container Escape*) hoặc ngốn sạch CPU/RAM của toàn cụm, hệ thống bắt buộc phải kích hoạt các cơ chế bảo vệ cấp hạ tầng và hệ điều hành:
* **Kiểm soát định mức tài nguyên bằng Linux `cgroups` và Kubernetes `ResourceQuota`:** Mọi nhóm container (Pod) phải được khai báo tường minh ngưỡng yêu cầu (`requests.cpu`, `requests.memory`) và ngưỡng trần cứng (`limits.cpu`, `limits.memory`). Cơ chế phân lớp chất lượng dịch vụ (*Pod QoS Classes: Guaranteed, Burstable*) kết hợp cùng bộ điều tiết nhân Linux (`cgroups v2`) sẽ lập tức khóa họng (*CPU Throttling*) hoặc thu hồi có chọn lọc các tiến trình vượt ngưỡng mà không làm sập nút máy chủ vật lý.
* **Vi phân đoạn mạng bằng `NetworkPolicy` và *Service Mesh (mTLS)*:** Trên mạng *Shared VPC*, hệ thống áp dụng nguyên tắc *Zero-Trust Network* thông qua các bộ điều khiển mạng container (như *Cilium eBPF* hoặc *Calico*) và *Service Mesh (Istio / Linkerd)* để mã hóa toàn bộ lưu lượng nội bộ (*East-West mTLS*) và chặn mọi kết nối ngang hàng trái phép giữa các phân vùng dịch vụ.
* **Ảo hóa nhẹ cấp nhân (*Sandboxed MicroVM*):** Khi cần thực thi các tác vụ có độ rủi ro cao trên hạ tầng gộp, Tầng 3 sử dụng các trình thực thi cô lập nhân như *AWS Firecracker* hoặc *Google gVisor* — tạo ra một lớp nhân bảo vệ riêng cho từng container với chi phí khởi tạo chỉ tính bằng mili-giây.

#### **2.3.1.4. Ánh xạ Chiều Ranh giới Thuê bao (B1 – B3) và Bàn luận Đánh đổi tại Tầng 1 – 3**
Chiếu theo khung lý thuyết **Bốn chiều Ranh giới Thuê bao (B1–B4)** của Chương 1, các quyết định thiết kế tại Tầng 1–3 tác động trực tiếp lên ba chiều ranh giới nền tảng:
* **Chiều B3 (Cô lập Hiệu năng – Trọng tâm xuyên suốt Tầng 1, 2 và 3):** Đây là chiều ranh giới quan trọng nhất mà cụm hạ tầng gánh vác. Ở phương án *Tách*, Chiều B3 được bảo đảm cứng bằng băng thông card mạng vật lý riêng, số nhân CPU riêng và dung lượng RAM máy ảo riêng. Ở phương án *Gộp*, trách nhiệm bảo vệ Chiều B3 được chuyển giao cho bộ lập lịch CPU của Hypervisor, cơ chế `cgroups`, `ResourceQuota` của Kubernetes và bộ giới hạn băng thông mạng (*Traffic Shaping*).
* **Chiều B2 (Cô lập Dữ liệu cấp vật lý tại Tầng 1):** Tại Tầng 1, việc tách máy chủ vật lý hoặc sử dụng chip bảo mật phần cứng (*AWS Nitro Security Chip / HSM*) bảo vệ dữ liệu đang nằm trên thanh ghi CPU và bộ nhớ RAM khỏi các cuộc tấn công đọc trộm bộ nhớ vật lý giữa các máy ảo đồng cư trú (*Co-resident VMs*).
* **Chiều B1 (Nhận diện & Xác thực cấp mạng tại Tầng 2):** Tại Tầng 2, định danh mạng (thông qua dải IP nguồn, chứng chỉ số *mTLS* của *Service Mesh* hoặc đường hầm VPN riêng) đóng vai trò là lớp nhận diện biên đầu tiên trước khi gói tin bước vào tầng phần mềm.

> **Bàn luận học thuật và Chuyển tiếp:** Nhìn tổng thể, sự lựa chọn giữa Tách và Gộp tại Tầng 1–3 là sự đánh đổi giữa **độ dày ranh giới vật lý (Cấp độ 4–5)** và **tính đàn hồi hạ tầng (*Infrastructure Elasticity*)**. Việc Tách ở Tầng 1–3 mang lại sự bảo chứng pháp lý cao nhất nhưng khiến thời gian khởi tạo hạ tầng cho khách hàng mới kéo dài từ vài phút đến hàng chục phút, đồng thời làm phát sinh chi phí cố định lớn cho mỗi cụm. Do đó, xu hướng chủ đạo của kiến trúc Cloud-Native hiện đại là **Gộp thông minh tại Tầng 1–3** trên nền tảng Kubernetes đa thuê bao, rồi đẩy các vách ngăn nhận thức ngữ cảnh `tenant_id` lên các tầng từ Tầng 4 trở lên. Câu hỏi đặt ra ngay khi bước qua ranh giới giữa hạ tầng (Tầng 3) và phần mềm lưu trữ (Tầng 4) là: *Khi các tệp tin và đối tượng dữ liệu phi cấu trúc của hàng nghìn thuê bao được đưa lên đám mây, chúng sẽ được phân tách và bảo vệ như thế nào?*

---

### **2.3.2. Tầng Lưu trữ Đám mây – Cloud Storage (Tầng 4)**

Bước qua đường ranh giới phân tách giữa hạ tầng nền tảng và phần mềm ứng dụng, **Tầng 4 (*Cloud Storage*)** là tầng đầu tiên thuộc **Phân vùng Nhận thức Thuê bao** (khung nét liền trên **Hình 2.1**). Đây là nơi khái niệm định danh thuê bao (`tenant_id`) bắt đầu xuất hiện tường minh trong cấu trúc định vị tài nguyên.

#### **2.3.2.1. Vị trí và Vai trò Quản trị Dữ liệu Phi cấu trúc trong Ngăn xếp**
Trong một nền tảng SaaS thực tế — đặc biệt là nền tảng cộng tác và quản lý công việc Kanban — bên cạnh các bản ghi có cấu trúc lưu trong cơ sở dữ liệu quan hệ, hệ thống phải tiếp nhận và phân phối một khối lượng rất lớn **dữ liệu phi cấu trúc và bán cấu trúc (*Unstructured & Binary Data*)**: các tệp tài liệu đính kèm trên thẻ công việc (*Card Attachments*: PDF, DOCX, XLSX, bản vẽ thiết kế, video quay màn hình), ảnh đại diện tổ chức/người dùng (*Avatars*), các gói dữ liệu kết xuất (*Board JSON/CSV Exports*) và các tệp nhật ký kiểm toán lưu trữ lạnh (*Archived Audit Logs*). Tầng 4 quản lý các tài nguyên này thông qua dịch vụ **Lưu trữ Đối tượng (*Object Storage* như Amazon S3, Google Cloud Storage, Azure Blob Storage, MinIO)** và **Lưu trữ Khối/Tệp (*Block & File Storage* như AWS EBS, EFS, Persistent Volumes)**.

#### **2.3.2.2. Phương án Tách (*Bucket-per-Tenant* / *Volume-per-Tenant*)**
Khi áp dụng chiến lược **Tách** tại Tầng 4, mỗi thuê bao được cấp phát một kho lưu trữ đối tượng độc lập (*Dedicated S3 Bucket*) hoặc một phân vùng ổ đĩa khối riêng (*Dedicated Encrypted EBS Volume*), đi kèm với một khóa mã hóa bất đối xứng/đối xứng riêng biệt trong hệ thống quản lý khóa đám mây (*Customer-Managed Key – CMK trên AWS KMS hoặc HashiCorp Vault*).
* **Ưu thế về bảo mật và tuân thủ:** Quyền truy cập được khóa cứng ở cấp độ mặt phẳng điều khiển đám mây thông qua chính sách *Bucket Policy* và vai trò *IAM Role* riêng biệt cho từng thuê bao. Đặc biệt, phương án này hỗ trợ hoàn hảo kỹ thuật **Xóa hủy bằng mật mã (*Crypto-shredding*)**: khi một khách hàng doanh nghiệp chấm dứt hợp đồng và yêu cầu xóa vĩnh viễn toàn bộ dữ liệu theo quy định GDPR, nhà cung cấp chỉ cần hủy khóa KMS của riêng Bucket đó là toàn bộ dữ liệu lịch sử (kể cả trong các bản sao lưu) lập tức trở thành vô nghĩa về mặt toán học.
* **Rào cản mở rộng quy mô:** Các nhà cung cấp đám mây áp đặt hạn mức cứng (*Service Quotas*) về số lượng Bucket tối đa trên mỗi tài khoản đám mây (chẳng hạn Amazon S3 mặc định giới hạn từ 100 đến 1.000 Buckets, và có trần cứng ở mức 10.000 Buckets). Do đó, nếu một nền tảng SaaS Kanban có 50.000 đội nhóm đăng ký sử dụng, phương án *Bucket-per-Tenant* sẽ sớm chạm trần giới hạn hạ tầng và làm tê liệt luồng đăng ký khách hàng mới.

#### **2.3.2.3. Phương án Gộp (*Shared Bucket với Prefix Partitioning & Short-Lived Pre-signed URL*)**
Để vượt qua giới hạn số lượng Bucket và tối ưu hóa quản trị lưu trữ cho hàng chục nghìn thuê bao, phương án **Gộp** hợp nhất toàn bộ đối tượng tệp tin vào một (hoặc một vài) *Shared Object Storage Bucket* theo vùng địa lý, nhưng thiết lập vách ngăn logic thông qua **Phân vùng Tiền tố Đường dẫn (*Key Prefix Partitioning*)**:
$$\text{ObjectKey} = \texttt{s3://kanban-shared-storage/tenants/}\{\text{tenant\_id}\}\texttt{/boards/}\{\text{board\_id}\}\texttt{/cards/}\{\text{card\_id}\}\texttt{/}\{\text{file\_uuid}\}$$

Vì toàn bộ tệp tin của các công ty khác nhau cùng nằm chung trong một Bucket vật lý, nếu ứng dụng cấu hình Bucket ở chế độ công khai (*Public Read*) hoặc cho phép trình duyệt của người dùng tự ghép đường dẫn để tải tệp, kẻ tấn công có thể dễ dàng đoán đường dẫn để tải trộm tài liệu mật của công ty khác. Để khóa chặt rủi ro này, phương án Gộp tại Tầng 4 bắt buộc phải thực thi cơ chế **Ủy quyền Tải tệp Gián tiếp qua URL Ký sẵn Ngắn hạn (*Short-Lived Pre-signed URLs*)** kết hợp **Chính sách Phiên Động (*Dynamic IAM Session Policy*)**:
1. **Chặn toàn bộ truy cập công khai (*Block All Public Access*):** Bucket dùng chung bị khóa kín hoàn toàn đối với mạng Internet bên ngoài; chỉ có tiến trình Backend (Tầng 8) mới có quyền giao tiếp với dịch vụ Object Storage.
2. **Xác thực ngữ cảnh trước khi cấp phát `Pre-signed URL`:** Khi người dùng muốn đính kèm hoặc tải xuống một tệp trên thẻ Kanban, trình duyệt phải gửi yêu cầu kèm thẻ bài JWT tới Backend. Backend kiểm tra xác nhận `tenant_id` trong JWT có quyền truy cập vào `board_id` và `card_id` đó, sau đó mới ký số sinh ra một đường dẫn tạm thời (`Pre-signed URL`) bị khóa cứng vào đúng tọa độ `tenants/{tenant_id}/...` và chỉ có hiệu lực trong vòng 60 đến 300 giây.
3. **Giới hạn phạm vi bằng *IAM Session Policy*:** Khi tiến trình ứng dụng yêu cầu sinh URL hoặc đọc tệp, nó tự động thu hẹp quyền của phiên làm việc hiện tại bằng điều kiện `s3:prefix = tenants/${tenant_id}/*`, đảm bảo ngay cả khi có lỗi ghép chuỗi ở tầng trên thì dịch vụ lưu trữ vẫn từ chối truy cập sang nhánh tiền tố của thuê bao khác.

#### **2.3.2.4. Ánh xạ Chiều Ranh giới Thuê bao (B2 & B1) và Bàn luận Đánh đổi tại Tầng 4**
Xét trên không gian 4 chiều của Ranh giới Thuê bao, Tầng 4 đóng vai trò là chốt chặn trọng yếu cho dữ liệu phi cấu trúc:
* **Chiều B2 (Cô lập Dữ liệu – Trọng tâm cốt lõi của Tầng 4):** Dù ở trạng thái nghỉ (*Data at Rest* – mã hóa bằng khóa KMS riêng hoặc khóa chung) hay trạng thái truy xuất (*Data in Transit*), mục tiêu tối thượng của Tầng 4 là đảm bảo tính bất khả xâm phạm của không gian tệp tin giữa các thuê bao. Phương án *Tách Bucket* bảo vệ Chiều B2 bằng ranh giới tài nguyên đám mây độc lập (Cấp độ 3–4), trong khi phương án *Gộp Bucket + Prefix* bảo vệ Chiều B2 bằng ranh giới đường dẫn kết hợp chữ ký mật mã học trên `Pre-signed URL` (Cấp độ 1–2).
* **Sự phối hợp với Chiều B1 (Nhận diện) và Chiều B3 (Hiệu năng I/O):** Việc sinh `Pre-signed URL` và áp dụng *IAM Session Policy* đòi hỏi Tầng 4 phải nhận diện chính xác định danh `tenant_id` truyền từ Chiều B1 xuống. Đồng thời, cách đặt `tenant_id` làm tiền tố phân vùng trên các hệ thống Object Storage hiện đại (như Amazon S3 tự động phân mảnh chỉ mục theo từng tiền tố `tenants/{tenant_id}/`) còn giúp phân tán đều tải đọc/ghi IOPS (lên tới 3.500 PUT/5.500 GET mỗi giây trên mỗi tiền tố), qua đó gián tiếp bảo vệ **Chiều B3 (Cô lập Hiệu năng)** trước hiện tượng nghẽn cổ chai I/O.

> **Bàn luận học thuật và Chuyển tiếp:** Phương án **Gộp (*Shared Bucket + Prefix Partitioning + Pre-signed URL*)** mang lại sự cân bằng xuất sắc giữa tính kinh tế, khả năng mở rộng không giới hạn số lượng thuê bao và độ an toàn mật mã học, nên được hầu hết các nền tảng SaaS hiện đại lựa chọn làm cấu hình tiêu chuẩn; trong khi phương án **Tách (*Bucket-per-Tenant*)** được giữ lại như một tùy chọn cao cấp cho khách hàng *Enterprise* yêu cầu *BYOK (Bring Your Own Key)*. Tuy nhiên, dữ liệu tệp tin ở Tầng 4 chỉ được truy xuất theo từng đối tượng rời rạc qua khóa đường dẫn. Thách thức thực sự phức tạp hơn nhiều nằm ở ngay hai tầng kế tiếp phía trên — **Tầng 5 (DBMS) và Tầng 6 (Database)**: *Nơi hàng triệu dòng dữ liệu có cấu trúc của các thuê bao phải liên tục tham gia vào các phép kết nối (JOIN), lọc (WHERE), sắp xếp (ORDER BY) và giao dịch nguyên tử (ACID Transactions) trong thời gian thực.*

---

### **2.3.3. Tầng Cơ sở Dữ liệu và Hệ Quản trị CSDL (Tầng 5 – 6)**

Nếu như các tầng tính toán phía trên có thể được thiết kế không lưu trạng thái (*Stateless*) để dễ dàng hủy bỏ và tạo mới trong vài giây, thì **Tầng 5 (*DBMS*)** và **Tầng 6 (*Database*)** chính là **trái tim có trạng thái (*Stateful Core*)** của toàn bộ kiến trúc đa thuê bao. Mọi sai lầm trong việc lựa chọn chiến lược Tách hay Gộp tại hai tầng này đều cực kỳ tốn kém để sửa chữa về sau và quyết định trực tiếp sự sống còn của nền tảng trên cả bốn phương diện: an toàn dữ liệu, hiệu năng truy vấn, khả năng tùy biến lược đồ và chi phí vận hành.

#### **2.3.3.1. Vị trí, Sự Phân định giữa Tầng 5 – Tầng 6 và Ba Phương án Tổ hợp Điển hình**
Mặc dù trong giao tiếp thông thường khái niệm "Cơ sở dữ liệu" hay được gọi gộp, mô hình 9 tầng của đề tài phân định rất rõ hai thực thể kiến trúc khác nhau:
* **Tầng 5 – Hệ Quản trị Cơ sở Dữ liệu (*Database Management System – DBMS*):** Là **tiến trình hệ thống thực thi** (như máy chủ `postgres`, `mysqld`, `mongod`) quản lý tài nguyên tính toán dữ liệu gồm: vùng bộ nhớ đệm trang dữ liệu (*Shared Buffers / Buffer Pool*), bộ ghi nhật ký giao dịch (*Write-Ahead Log – WAL*), bộ lập lịch tiến trình nền (`autovacuum`, `checkpoint`), trình tối ưu hóa truy vấn (*Query Planner*) và bể kết nối vật lý (*Connection Pool*).
* **Tầng 6 – Cơ sở Dữ liệu Logic (*Logical Database & Schema*):** Là **cấu trúc tổ chức và lưu trữ dữ liệu logic** nằm bên trong DBMS, bao gồm các cấp độ từ lớn đến nhỏ: Cơ sở dữ liệu logic (*Database*), Không gian tên lược đồ (*Schema / Namespace*), Bảng dữ liệu (*Tables*), Chỉ mục (*B-Tree / GIN Indexes*) và Chính sách bảo mật dòng (*Row-Level Security Policies*).

Chính nhờ sự phân tách rành mạch giữa Tầng 5 (Tiến trình DBMS) và Tầng 6 (Cấu trúc Database/Schema/Table) này, chúng ta thấy rõ vì sao trong lịch sử phát triển kiến trúc dữ liệu SaaS (từ công trình nền tảng của Aulbach et al., 2008; Chong et al., 2006 đến khung tham chiếu của AWS và Microsoft), các quyết định Tách – Gộp tại hai tầng này hội tụ thành **ba phương án thiết kế kinh điển** tương ứng với ba sơ đồ *Zoom-in* từ **Hình 2.6** đến **Hình 2.8**.

#### **2.3.3.2. Phương án 1 – Tách toàn phần Hệ Quản trị và Cơ sở Dữ liệu (*Dedicated DBMS / Database-per-Tenant* – Tách cả Tầng 5 và Tầng 6)**
Ở phương án cô lập triệt để nhất này, mỗi thuê bao được cấp phát một tiến trình máy chủ hệ quản trị CSDL riêng biệt (*Dedicated DBMS Server* tại Tầng 5) gắn với phân vùng ổ đĩa lưu trữ riêng (Tầng 4), hoặc tối thiểu là một Cơ sở dữ liệu độc lập (*Dedicated Logical Database* tại Tầng 6) bên trong cụm máy chủ.

![Hình 2.6: Zoom-in Tầng 4–6 – Phương án Tách biệt Máy chủ Hệ quản trị CSDL (Dedicated DBMS) và Lưu trữ độc lập cho từng Thuê bao](../diagrams/diagrams_C2/png/hinh_2_6_data_isolation.drawio.png)

*Hình 2.6: Zoom-in Tầng 4–6 – Phương án Tách biệt Máy chủ Hệ quản trị CSDL (Dedicated DBMS) và Lưu trữ độc lập cho từng Thuê bao. (Bản vẽ chuẩn hóa XML: [hinh_2_6_data_isolation.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_6_data_isolation.drawio))*

Quan sát **Hình 2.6**, từ bộ định tuyến truy cập dữ liệu ở tầng ứng dụng (`Tenant-Aware Data Access Router`), kết nối của *Tenant A* và *Tenant B* được rẽ nhánh vật lý tới hai máy chủ hoàn toàn tách rời (`Database Server A` và `Database Server B` đặt trong hai khung nét đứt độc lập). Mỗi máy chủ sở hữu tiến trình `PostgreSQL Instance` riêng (Tầng 5), cơ sở dữ liệu `db_tenant_a / db_tenant_b` riêng (Tầng 6) và phân vùng lưu trữ mã hóa `Encrypted Volume` với khóa `KMS Key A / Key B` riêng (Tầng 4).

* **Đặc tính kỹ thuật và Ưu điểm:** Giữa hai thuê bao không tồn tại bất kỳ sự chia sẻ nào về *Shared Buffers*, *WAL I/O*, *CPU* hay tệp dữ liệu vật lý. Một câu truy vấn `SELECT * FROM cards` thực thi trên `Database Server A` về mặt vật lý không bao giờ có thể chạm tới dữ liệu của *Tenant B* ngay cả khi lập trình viên bỏ quên mệnh đề `WHERE`. Hơn nữa, việc sao lưu và khôi phục dữ liệu theo thời điểm (*Point-in-Time Recovery – PITR*) hay nâng cấp phiên bản CSDL có thể thực hiện riêng lẻ theo lịch trình của từng khách hàng lớn.
* **Rào cản mở rộng quy mô:** Mỗi tiến trình DBMS ở Tầng 5 tiêu tốn một lượng bộ nhớ RAM nền cố định (tối thiểu từ vài trăm MB đến vài GB). Ngay cả khi gộp Tầng 5 mà chỉ tách *Database* ở Tầng 6 (*Database-per-Tenant*), trong kiến trúc của PostgreSQL và nhiều RDBMS khác, một kết nối TCP vật lý trong *Connection Pool* một khi đã mở vào `db_tenant_a` thì **không thể chuyển đổi sang `db_tenant_b`** mà không đóng kết nối cũ và bắt tay TCP/TLS lại từ đầu. Điều này khiến hệ thống không thể chia sẻ chung một bể kết nối giữa các thuê bao, dẫn tới hiện tượng cạn kiệt kết nối (*Connection Exhaustion*) rất nhanh khi số lượng thuê bao vượt ngưỡng vài trăm.

#### **2.3.3.3. Phương án 2 – Gộp chung Toàn phần với Bảng Chia sẻ và RLS (*Shared DBMS, Shared Database, Shared Table + Row-Level Security* – Gộp cả Tầng 5 và Tầng 6)**
Ở cực đối diện nhằm tối ưu hóa triệt để Tổng chi phí sở hữu (TCO), mật độ đóng gói tài nguyên và khả năng mở rộng tới hàng trăm nghìn thuê bao, toàn bộ khách hàng cùng chia sẻ một cụm DBMS (Tầng 5), cùng kết nối vào một Database duy nhất và cùng lưu trữ dữ liệu trong một tập hợp các bảng dùng chung (*Shared Tables* tại Tầng 6). Khi đó, mọi bảng nghiệp vụ (như `workspaces`, `boards`, `lists`, `cards`, `comments`) đều bắt buộc có cột định danh `tenant_id` (được thiết kế làm cột dẫn đầu trong các chỉ mục tổ hợp `B-Tree Index (tenant_id, ...)` để tối ưu hóa tốc độ quét chỉ mục cục bộ theo từng thuê bao).

Tuy nhiên, thách thức lớn nhất của bảng dùng chung là: nếu chỉ dựa vào việc lập trình viên tự viết thêm điều kiện `WHERE tenant_id = ?` trong hàng nghìn câu lệnh SQL ở tầng ứng dụng, chỉ cần một câu truy vấn phức tạp bị bỏ sót điều kiện lọc là dữ liệu của toàn bộ các công ty sẽ bị phơi bày. Để giải quyết tận gốc rủi ro này, kiến trúc đa thuê bao hiện đại chuyển giao trách nhiệm thực thi vách ngăn xuống thẳng **Nhân Hệ quản trị CSDL thông qua cơ chế Bảo mật Cấp độ Dòng (*Row-Level Security – RLS Engine*)**.

![Hình 2.7: Zoom-in Tầng 6 – Phương án Gộp Shared-Table với cơ chế kiểm soát truy cập tự động bằng RLS Engine](../diagrams/diagrams_C2/png/hinh_2_7_tco_rls_engine.drawio.png)

*Hình 2.7: Zoom-in Tầng 6 – Phương án Gộp Shared-Table với cơ chế kiểm soát truy cập tự động bằng RLS Engine. (Bản vẽ chuẩn hóa XML: [hinh_2_7_tco_rls_engine.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_7_tco_rls_engine.drawio))*

Như minh họa trực quan trên **Hình 2.7**, bên trong cùng một bảng vật lý `Shared Table: public.tasks`, các bản ghi của `t_alpha` (Dòng 1, Dòng 3) và `t_beta` (Dòng 2, Dòng 4) nằm xen kẽ nhau trên cùng các trang đĩa. Thế nhưng, mọi câu lệnh SQL từ tầng ứng dụng gửi xuống đều bắt buộc phải đi qua chốt chặn **PostgreSQL RLS Engine** (`CREATE POLICY tenant_isolation_policy`):
* Khi phiên giao dịch đã được thiết lập biến ngữ cảnh hợp lệ (`current_tenant_id = 't_alpha'`), *RLS Engine* tự động can thiệp vào trình phân tích truy vấn (*Query Parser/Rewriter*), gắn cứng vị từ lọc `WHERE tenant_id = current_setting('app.current_tenant_id')` vào kế hoạch thực thi để chỉ trả về đúng Dòng 1 và Dòng 3.
* Ngược lại, nếu một truy vấn cố tình truy cập trái phép hoặc do lỗi phần mềm mà quên thiết lập biến ngữ cảnh phiên, *RLS Engine* lập tức kích hoạt cơ chế **Fail-Closed (Đóng an toàn)**, chặn đứng truy cập và trả về tập kết quả rỗng (`0 rows`) hoặc ngoại lệ bảo mật, bảo vệ tuyệt đối các dòng dữ liệu của `t_beta`.

#### **2.3.3.4. Phương án 3 – Điểm Cân bằng Trung gian: Gộp DBMS nhưng Tách Schema (*Shared DBMS, Shared Database, Dedicated Schema-per-Tenant* – Gộp Tầng 5, Tách không gian tên Tầng 6)**
Nằm ở vị trí trung gian nhằm dung hòa giữa *Dedicated Database* và *Shared Table* là phương án **Schema-per-Tenant** (hạt nhân dữ liệu của mô hình *Bridge* đã giới thiệu ở Mục 2.2.3). Trong phương án này, các thuê bao cùng chia sẻ một tiến trình máy chủ DBMS (Tầng 5) và cùng kết nối vào một Database vật lý duy nhất — nhờ đó **giải quyết được bài toán dùng chung một bể kết nối (*Shared Connection Pool*)** — nhưng bên trong Database đó, mỗi thuê bao được cấp phát một **Không gian tên Lược đồ riêng biệt (*Dedicated Schema*)**, ví dụ: `schema: tenant_alpha`, `schema: tenant_beta`.

![Hình 2.8: Zoom-in Tầng 6 – Phương án Tách Schema (Schema-per-Tenant) kết hợp chuyển mạch `SET LOCAL search_path` và mở rộng bảng tùy biến](../diagrams/diagrams_C2/png/hinh_2_8_schema_namespace.drawio.png)

*Hình 2.8: Zoom-in Tầng 6 – Phương án Tách Schema (Schema-per-Tenant) kết hợp chuyển mạch `SET LOCAL search_path` và mở rộng bảng tùy biến. (Bản vẽ chuẩn hóa XML: [hinh_2_8_schema_namespace.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_8_schema_namespace.drawio))*

Quan sát **Hình 2.8**, khi tiến trình ứng dụng mượn một kết nối từ *Connection Pool* để phục vụ yêu cầu của một thuê bao, hệ thống thực thi câu lệnh chuyển mạch đường dẫn tìm kiếm lược đồ trong phạm vi giao dịch hiện tại:
$$\texttt{SET LOCAL search\_path TO tenant\_alpha;}$$
Kể từ thời điểm đó, mọi câu lệnh SQL nghiệp vụ của ứng dụng (như `SELECT * FROM tasks WHERE status = 'DOING'`) sẽ được PostgreSQL tự động phân giải thẳng vào bảng `tenant_alpha.tasks` mà không cần sửa đổi mã nguồn SQL và cũng không cần cột `tenant_id` bên trong bảng. Đặc biệt, như minh họa ở nửa dưới của **Hình 2.8**, phương án này cho phép **tùy biến cấu trúc dữ liệu vật lý cho từng thuê bao**: bên cạnh các bảng chuẩn (`tasks`, `users`), `Schema: tenant_alpha` có thể tạo thêm bảng mở rộng riêng `custom_audit_logs (hipaa_code, signature)` phục vụ kiểm toán y tế, trong khi `Schema: tenant_beta` lại tạo bảng riêng `custom_workflows (step_order, webhook_url)` phục vụ tự động hóa mà không hề làm ảnh hưởng tới lược đồ của nhau. Tuy nhiên, khi số lượng thuê bao vượt ngưỡng vài nghìn ($N > 5.000$), hàng chục nghìn bảng nhân bản trong các Schema sẽ làm phình đại bảng danh mục hệ thống (`pg_class`, `pg_attribute`) của PostgreSQL (*Catalog Bloat*), gây suy giảm hiệu năng bộ nhớ đệm siêu dữ liệu và làm chậm quá trình chạy *Schema Migration*.

#### **2.3.3.5. Ánh xạ Chiều Ranh giới Thuê bao (B2 & B3) và Bảng Đối sánh Chuyên sâu tại Tầng 5 – 6**
Việc phân tích tách bạch Tầng 5 và Tầng 6 cho phép chúng ta ánh xạ chính xác trách nhiệm bảo vệ Ranh giới Thuê bao tại trái tim dữ liệu của hệ thống:
* **Tại Tầng 6 (Database & Schema) – Trọng tâm tuyệt đối là Chiều B2 (Cô lập Dữ liệu):** Mọi cấu trúc tại Tầng 6 (từ việc tách `db_tenant_a`, tách `Schema: tenant_alpha` cho tới việc gắn cột `tenant_id` và kích hoạt chính sách `RLS Policy`) đều hướng tới một mục đích tối thượng duy nhất là bảo vệ **Chiều B2**: đảm bảo tính toàn vẹn, tính bí mật và sự phân tách không gian đọc/ghi dữ liệu giữa các thuê bao. Đồng thời, khả năng mở rộng bảng riêng trong *Schema-per-Tenant* hoặc dùng cột `JSONB` trong *Shared-Table* cung cấp nền tảng lưu trữ vật lý phục vụ cho **Chiều B4 (Tùy biến cấu trúc dữ liệu)**.
* **Tại Tầng 5 (DBMS Instance) – Trọng tâm kép gồm Chiều B2 (Cô lập Phiên) và Chiều B3 (Cô lập Hiệu năng CSDL):** Khi nhiều thuê bao dùng chung một tiến trình DBMS (ở cả phương án *Schema-per-Tenant* lẫn *Shared-Table*), Tầng 5 vừa phải bảo vệ **Chiều B2** thông qua cơ chế cô lập biến phiên giao dịch (`SET LOCAL` trên *Connection Pool* để hai giao dịch kế tiếp không đọc nhầm ngữ cảnh của nhau), vừa phải gánh vác **Chiều B3 (Cô lập Hiệu năng)**. Lý do là bởi các truy vấn từ mọi thuê bao cùng tranh chấp bộ nhớ đệm *Shared Buffers*, băng thông ghi đĩa *WAL*, khóa bảng/chỉ mục và CPU của máy chủ DBMS. Do đó, tại Tầng 5, hệ thống cần kết hợp cấu hình giới hạn thời gian chạy tối đa của mỗi câu lệnh (`statement_timeout`), giới hạn bộ nhớ làm việc mỗi phiên (`work_mem`) và định tuyến các truy vấn báo cáo nặng sang các máy chủ bản sao chỉ đọc (*Read Replicas*) để ngăn chặn một truy vấn phức tạp làm treo toàn bộ CSDL.

Để tổng kết toàn diện sự đánh đổi giữa ba phương án thiết kế tại Tầng 5–6, **Bảng 2.2** đối chiếu định lượng và định tính trên 7 tiêu chí kỹ thuật cốt lõi.

*Bảng 2.2: Đối sánh ba phương án tổ chức dữ liệu đa thuê bao tại Tầng 5 (DBMS) và Tầng 6 (Database).*

| Tiêu chí Kỹ thuật | Phương án 1: **Dedicated DBMS / Database** *(Tách Tầng 5 & 6)* | Phương án 2: **Dedicated Schema-per-Tenant** *(Gộp Tầng 5, Tách Schema Tầng 6)* | Phương án 3: **Shared-Table + RLS** *(Gộp toàn phần Tầng 5 & 6)* |
| :--- | :--- | :--- | :--- |
| **1. Ranh giới Cô lập Dữ liệu (Chiều B2)** | Vật lý hoặc cấp độ Database độc lập (Cấp độ 4–5). | Cấp độ Không gian tên (*Namespace / Schema*) trong cùng DB (Cấp độ 3). | Cấp độ Dòng bản ghi (*Row-Level*) qua chính sách `RLS Policy` (Cấp độ 1–2). |
| **2. Hiệu quả Tái sử dụng *Connection Pool*** | **Kém:** Mỗi DB phải duy trì *Connection Pool* riêng, gây lãng phí kết nối nhàn rỗi. | **Tốt:** Dùng chung 1 *Connection Pool* duy nhất, chuyển mạch bằng `SET LOCAL search_path`. | **Tối ưu nhất:** Dùng chung 1 *Connection Pool* duy nhất, chuyển mạch bằng `SET LOCAL app.current_tenant_id`. |
| **3. Khả năng Mở rộng theo Số lượng Thuê bao ($N$)** | Thấp ($N \lesssim 10^2$): Bị chặn bởi chi phí RAM/CPU trên mỗi DBMS instance và giới hạn kết nối. | Trung bình ($N \lesssim 10^3 - 5 \times 10^3$): Khi $N > 10.000$ Schema, bảng hệ thống `pg_class` bị phình đại (*Catalog Bloat*). | Rất cao ($N \sim 10^4 - 10^6+$): Số lượng bảng trong `pg_class` là hằng số $O(1)$ không phụ thuộc vào $N$. |
| **4. Độ phức tạp Nâng cấp Lược đồ (*Schema Migration*)** | $O(N)$ kết nối mạng tuần tự/song song tới $N$ máy chủ DB; rủi ro lệch phiên bản (*Schema Drift*) cao. | $O(N)$ vòng lặp DDL (`ALTER TABLE`) qua từng Schema; thời gian khóa siêu dữ liệu tăng tuyến tính theo $N$. | **$O(1)$ thao tác duy nhất:** Chạy `ALTER TABLE` một lần trên bảng chung cho toàn bộ $N$ thuê bao. |
| **5. Khả năng Tùy biến Lược đồ (Hỗ trợ Chiều B4)** | Toàn quyền (cho phép thêm bảng, cột, trigger, extension riêng biệt cho từng khách hàng). | Cao (cho phép thêm bảng/cột riêng trong từng Schema như **Hình 2.8**, nhưng làm phức tạp ORM). | Hạn chế ở mức DDL trực tiếp; giải quyết hiệu quả bằng cột `JSONB` (PostgreSQL) và siêu dữ liệu. |
| **6. Độ phức tạp Sao lưu & Khôi phục (*Backup / Restore*) theo Thuê bao** | **Rất dễ:** Dùng công cụ snapshot ổ đĩa hoặc `pg_dump` nguyên DB của đúng thuê bao đó. | **Dễ:** Dùng `pg_dump --schema=tenant_x` để trích xuất và khôi phục độc lập một Schema. | **Phức tạp:** Muốn khôi phục 1 thuê bao phải trích xuất từ bản backup toàn cục theo bộ lọc `WHERE tenant_id = '...'`. |
| **7. Hiệu ứng *Noisy Neighbor* tại Tầng Dữ liệu (Chiều B3)** | Không xảy ra (nếu tách DBMS vật lý) hoặc rất thấp. | Có thể xảy ra ở mức tranh chấp *Shared Buffers*, *WAL I/O* và CPU của máy chủ DBMS chung. | Cao nhất (ngoài tranh chấp CPU/I/O còn có thể tranh chấp khóa chỉ mục B-Tree và tiến trình `AUTOVACUUM`). |

> **Bàn luận chuyển tiếp:** Qua phân tích Tầng 4, 5 và 6, chúng ta thấy các cơ chế bảo vệ dữ liệu như `Pre-signed URL`, `SET LOCAL search_path` hay `RLS Engine (current_setting('app.current_tenant_id'))` đều có một điểm chung cốt tử: **chúng chỉ có thể vận hành chính xác nếu được cung cấp một định danh `tenant_id` đã được xác thực đáng tin cậy từ các tầng phía trên truyền xuống**, đồng thời cần một lớp đệm thông minh ở phía trước để giảm tải truy vấn trực tiếp vào ổ đĩa CSDL. Điều này dẫn dắt chúng ta tiến lên **Tầng 7 (Middleware)** — trạm kiểm soát và điều phối trung tâm của toàn bộ kiến trúc.

---

### **2.3.4. Tầng Phần mềm Trung gian – Middleware (Tầng 7)**

Nếu coi Tầng 5–6 là "kho ngân khố" lưu giữ tài sản dữ liệu của các thuê bao, và Tầng 8–9 là "khu vực xử lý nghiệp vụ", thì **Tầng 7 (*Middleware*)** chính là **hệ thống cổng an ninh, trạm điều phối giao thông và bộ nhớ đệm trung gian** nối liền thế giới bên ngoài với lõi hệ thống bên trong.

#### **2.3.4.1. Vị trí và Vai trò "Trạm Kiểm soát Trung tâm" trong Ngăn xếp**
Như đã biện luận tại Mục 5.2 và 5.3 của Chương 1, việc đưa **Tầng 7 (*Middleware*)** từ phân vùng hạ tầng nét đứt lên **Phân vùng Nhận thức Thuê bao (khung nét liền trên Hình 2.1)** là một bước tiến căn bản của kiến trúc Cloud-Native hiện đại so với mô hình nguyên bản năm 2015 của Kabbedijk et al. Trong một nền tảng SaaS phân tán hiện đại, Tầng 7 quy tụ bốn thành phần dịch vụ trung gian cốt lõi:
1. **Cổng giao tiếp và Định tuyến Biên (*API Gateway / Ingress Router* như Kong, Envoy, AWS API Gateway, Nginx):** Điểm tiếp xúc đầu tiên (*First Point of Contact*) tiếp nhận mọi kết nối HTTP/REST và WebSocket từ người dùng.
2. **Bộ nhớ Đệm Phân tán (*Distributed In-Memory Cache* như Redis Cluster, Memcached):** Giảm tải truy vấn đọc lặp lại cho tầng CSDL và lưu trữ trạng thái phiên/bộ đếm tốc độ truy cập.
3. **Hệ thống Hàng đợi Tin nhắn và Luồng Sự kiện (*Message Broker / Event Streaming* như Apache Kafka, RabbitMQ, Redis Streams):** Điều phối các tác vụ xử lý bất đồng bộ (như gửi thông báo thời gian thực, đẩy Webhook, xuất báo cáo nền).
4. **Hạ tầng Khả năng Quan sát và Đo lường (*Observability & Telemetry Pipeline* như OpenTelemetry Collector, Prometheus, Grafana Loki):** Thu thập nhật ký (*Logs*), chỉ số hiệu năng (*Metrics*) và vết thực thi (*Distributed Traces*) gắn nhãn theo từng thuê bao.

#### **2.3.4.2. Phương án Tách tại Tầng 7 (*Dedicated Middleware Instances*)**
Khi áp dụng chiến lược **Tách** tại Tầng 7 (thường dành cho các khách hàng thuộc phân khúc *Enterprise Silo* hoặc *Dedicated Cell*), mỗi thuê bao lớn được cấp phát các thực thể phần mềm trung gian độc lập: cổng *API Gateway / Load Balancer* riêng gắn với tên miền tùy chỉnh và chứng chỉ SSL riêng (`kanban.enterprise-corp.com`), thực thể *Redis Cache Instance* riêng trên vùng nhớ độc lập, và các chủ đề sự kiện *Kafka Topic* hoặc không gian ảo *RabbitMQ Virtual Host (`vhost`)* hoàn toàn tách biệt. Phương án này đảm bảo rằng một cơn bão sự kiện (*Event Storm*) hay hiện tượng tràn bộ nhớ đệm từ một khách hàng sẽ bị cô lập hoàn toàn trong các thực thể trung gian của riêng khách hàng đó.

#### **2.3.4.3. Phương án Gộp tại Tầng 7 và Cơ chế Điều phối Nhận thức Thuê bao (*Shared Tenant-Aware Middleware*)**
Khi áp dụng chiến lược **Gộp**, toàn bộ các thuê bao cùng đi qua một cụm *API Gateway* thống nhất, cùng đọc/ghi trên một cụm *Redis Cluster* dùng chung và cùng đẩy thông điệp vào các hàng đợi sự kiện chung. Để tầng Middleware dùng chung này không trở thành điểm nghẽn toàn cục (*Single Point of Congestion*) hoặc làm rò rỉ dữ liệu đệm giữa các tổ chức, Tầng 7 phải vận hành bốn cơ chế kiểm soát nhận thức ngữ cảnh thuê bao:
1. **Phân giải Ngữ cảnh Biên và Định tuyến Phân tầng (*Edge Context Resolution & Tier-Aware Routing*):** Ngay khi gói tin HTTPS đi vào *API Gateway*, bộ lọc xác thực (*Auth Filter*) tiến hành kiểm tra chữ ký số mật mã học của thẻ bài *JSON Web Token (JWT)*, trích xuất cặp siêu dữ liệu định danh `(tenant_id, tier)` đã được xác thực và quyết định nhánh định tuyến đích.
2. **Giới hạn Lưu lượng Động theo Thuê bao và Gói cước (*Per-Tenant & Tier-Based Rate Limiting*):** Sử dụng thuật toán *Token Bucket* hoặc *Sliding Window Counter* lưu trên Redis với khóa đếm phân tách theo `tenant_id` (ví dụ: giới hạn thuê bao gói *Free* ở mức 60 yêu cầu/phút, gói *Pro* ở mức 600 yêu cầu/phút và gói *Enterprise* ở mức 6.000 yêu cầu/phút). Cơ chế này giúp chặn đứng các cuộc tấn công làm cạn kiệt tài nguyên hoặc lỗi vòng lặp gọi API từ một thuê bao ngay tại biên mạng trước khi chúng kịp chạm tới Tầng 8 hay Tầng 5–6.
3. **Đóng gói Không gian Khóa Bộ nhớ Đệm (*Cache Key Namespacing*):** Mọi bản ghi lưu trên cụm Redis dùng chung bắt buộc phải được gắn tiền tố định danh thuê bao theo chuẩn `tenant:{tenant_id}:{domain}:{entity_id}` để triệt tiêu hoàn toàn nguy cơ đọc nhầm bộ nhớ đệm chéo (*Cross-Tenant Cache Poisoning*).
4. **Lập lịch Công bằng trên Hàng đợi Bất đồng bộ (*Fair Queueing & Weighted Consumers*):** Khi các tác vụ nền của nhiều thuê bao cùng đẩy vào một hàng đợi dùng chung, mỗi thông điệp đều phải mang tiêu đề `X-Tenant-ID` và `X-Tenant-Tier`. Các cụm tiến trình xử lý nền (*Worker Consumers*) áp dụng thuật toán *Weighted Round-Robin* hoặc tách làn ưu tiên (*Priority Lanes*) để đảm bảo một thuê bao vừa kích hoạt tác vụ xuất 50.000 thẻ công việc không thể làm "đói tài nguyên" (*Queue Starvation*) các thông báo thời gian thực của những thuê bao khác.

![Hình 2.9: Zoom-in Tầng 7 (Middleware) – Cơ chế phân giải JWT, kiểm tra gói cước (`tier`) và định tuyến phân tầng tại API Gateway](../diagrams/diagrams_C2/png/hinh_2_9_customer_segmentation.drawio.png)

*Hình 2.9: Zoom-in Tầng 7 (Middleware) – Cơ chế phân giải JWT, kiểm tra gói cước (`tier`) và định tuyến phân tầng tại API Gateway. (Bản vẽ chuẩn hóa XML: [hinh_2_9_customer_segmentation.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_9_customer_segmentation.drawio))*

**Hình 2.9** minh họa trực quan vai trò điều phối trung tâm của Tầng 7: luồng yêu cầu `HTTPS Request + JWT` đi vào khối `AuthFilter` để xác thực chữ ký và trích xuất `{tenant_id, tier}`. Ngay sau đó, khối quyết định `Tier-Aware Router` kiểm tra giá trị `tier`: nếu `tier = 'FREE' | 'PRO'`, yêu cầu được định tuyến vào cụm thực thi dùng chung `Shared App Pool` (khung nét liền màu xanh lá); nếu `tier = 'ENTERPRISE'`, yêu cầu được chuyển hướng sang cụm thực thi độc lập `Dedicated App Silo` (khung nét đứt màu đỏ).

#### **2.3.4.4. Ánh xạ Chiều Ranh giới Thuê bao (B1, B3, B4) và Bàn luận Đánh đổi tại Tầng 7**
Điểm đặc biệt nhất của Tầng 7 dưới góc nhìn lý thuyết Ranh giới Thuê bao là nơi **hội tụ và giao thoa của tới ba chiều ranh giới cốt lõi (B1, B3 và B4)**:
* **Chiều B1 (Nhận diện & Xác thực – Trụ cột đầu vào tại Tầng 7):** Cổng *API Gateway* tại Tầng 7 chính là nơi thiết lập Chiều B1 cho toàn bộ hệ thống. Bằng việc xác thực chữ ký JWT và đóng dấu ngữ cảnh `(tenant_id, tier)` đáng tin cậy vào yêu cầu trước khi chuyển lên Tầng 8, Tầng 7 ngăn chặn mọi hành vi giả mạo định danh thuê bao từ phía trình duyệt khách.
* **Chiều B3 (Cô lập Hiệu năng – Lá chắn chống *Noisy Neighbor* tại Tầng 7):** Thông qua bộ ba cơ chế *Per-Tenant Rate Limiting* (tại API Gateway), *Cache Eviction Protection* (tại tầng bộ nhớ đệm) và *Fair Queueing* (tại hàng đợi thông điệp), Tầng 7 đóng vai trò là tuyến phòng thủ chủ lực bảo vệ Chiều B3, ngăn không cho tải đột biến của một thuê bao lan truyền xuống làm sập tầng ứng dụng và tầng CSDL. Đồng thời, hệ thống *Observability* tại Tầng 7 gắn nhãn `tenant_id` vào mọi *Metrics/Traces* để giám sát mức tiêu thụ tài nguyên thời gian thực của từng thuê bao.
* **Chiều B4 (Cô lập Cấu hình & Phân tầng Dịch vụ tại Tầng 7):** Như thể hiện trên **Hình 2.9**, bộ định tuyến `Tier-Aware Router` và cấu hình hạn mức *Rate Limit* khác nhau cho từng bậc gói cước (`FREE`, `PRO`, `ENTERPRISE`) tại Tầng 7 chính là sự hiện thực hóa trực tiếp của Chiều B4 ngay ở tầng trung gian. *(Bên cạnh đó, việc phân tách tiền tố khóa `tenant:{id}:*` trên Redis cũng trực tiếp hỗ trợ **Chiều B2** cho dữ liệu lưu tạm trên bộ nhớ đệm).*

> **Bàn luận học thuật và Chuyển tiếp:** Việc đầu tư xây dựng một Tầng 7 (Middleware) có nhận thức sâu về thuê bao (*Tenant-Aware Middleware*) giúp giải phóng các dịch vụ nghiệp vụ ở phía sau khỏi gánh nặng kiểm tra xác thực thô và chống tấn công từ chối dịch vụ. Một khi yêu cầu của người dùng đã vượt qua trạm kiểm soát Tầng 7 với đầy đủ thông tin định danh `(tenant_id, tier)` hợp lệ, nó sẽ bước vào đỉnh cao nhất của ngăn xếp 9 tầng: **Tầng 8 (Application Runtime) và Tầng 9 (Application Code & Logical Configuration)** — nơi trực tiếp thực thi các thuật toán nghiệp vụ Kanban và quyết định sự thành bại của triết lý *Một bộ mã nguồn duy nhất (Single Codebase)*.

---

### **2.3.5. Tầng Thực thi Ứng dụng và Mã nguồn / Cấu hình Logic (Tầng 8 – 9)**

Đứng ở đỉnh của mô hình Ngăn xếp 9 tầng Cloud-Native là **Tầng 8 (*Application Runtime*)** và **Tầng 9 (*Application Code & Logical Configuration*)**. Nếu như ở các tầng bên dưới, người kiến trúc sư có thể dựa một phần vào các công cụ hạ tầng đám mây (như Kubernetes ở Tầng 3, S3 ở Tầng 4, PostgreSQL ở Tầng 5–6 hay Kong/Redis ở Tầng 7), thì tại Tầng 8 và Tầng 9, **100% trách nhiệm thiết kế thuộc về kiến trúc phần mềm và kỹ thuật lập trình của đội ngũ phát triển**. Để làm sáng tỏ mối quan hệ hữu cơ cũng như ranh giới trách nhiệm giữa hai tầng đỉnh ngăn xếp này, mục này phân tích sâu cấu trúc của từng tầng và tổng hợp trực quan qua sơ đồ **Hình 2.9b**.

#### **2.3.5.1. Vị trí và Sự Phân công Bản chất giữa Tầng 8 (Không gian Tiến trình lúc chạy) và Tầng 9 (Không gian Mã nguồn & Cấu hình)**
Trong nhiều tài liệu cũ, "Tầng ứng dụng" thường bị gộp chung thành một khối mờ nhạt. Tuy nhiên, để thiết kế một hệ thống đa thuê bao chính xác, bắt buộc phải phân biệt rõ hai thực thể ở hai thời điểm tồn tại khác nhau:
* **Tầng 8 – Thực thi Ứng dụng (*Application Runtime – Không gian Động lúc chạy*):** Bao gồm các tiến trình máy chủ ứng dụng đang hoạt động trong bộ nhớ (như máy ảo *Java Virtual Machine – JVM*, tiến trình *Node.js V8 Event Loop*, *Go Runtime* hoặc *.NET CLR*), vùng bộ nhớ cấp phát động (*Heap Memory*), bộ thu gom rác (*Garbage Collector – GC*), bể luồng xử lý yêu cầu (*Worker Thread Pool*) và các phiên kết nối thời gian thực đang mở (*WebSocket Sessions*). Tầng 8 trả lời câu hỏi: *"Mã nguồn của ứng dụng đang được nạp vào những tiến trình nào và sử dụng chung hay riêng vùng nhớ RAM/CPU lúc chạy?"*.
* **Tầng 9 – Mã nguồn và Cấu hình Logic (*Application Code & Logical Configuration – Không gian Logic & Siêu dữ liệu*):** Bao gồm kho mã nguồn nghiệp vụ cốt lõi (chẳng hạn trong hệ thống SaaS Kanban: các mô-đun quản lý *Workspace, Board, Column/List, Card, WIP Limit, Drag-and-Drop Ordering*), các tập quy tắc phân quyền (*RBAC/ABAC Policies*), cấu trúc siêu dữ liệu tùy biến (*Custom Fields Metadata*) và hệ thống quy tắc đánh giá cờ tính năng (*Feature Flag Rulesets*). Tầng 9 trả lời câu hỏi: *"Hệ thống duy trì một hay nhiều nhánh mã nguồn, và làm thế nào để cùng một đoạn mã nghiệp vụ có thể ứng xử khác nhau cho từng thuê bao?"*.

#### **2.3.5.2. Chiến lược Tách và Gộp tại Tầng 8 (Application Runtime)**
Khi một yêu cầu đã được định tuyến từ Tầng 7 lên Tầng 8, hệ thống có hai phương án tổ chức không gian tiến trình thực thi (tương ứng với hai nhánh ở nửa dưới của **Hình 2.9b**):
1. **Phương án Tách tại Tầng 8 (*Dedicated Runtime Silo – Process/Pod-per-Tenant*):**
   Mỗi thuê bao (thường áp dụng cho khách hàng *Enterprise VIP*) được khởi chạy một tập hợp các tiến trình hoặc Pod ứng dụng hoàn toàn riêng biệt (`Dedicated App Pod / Instance`). Khi đó, không gian địa chỉ bộ nhớ ảo (*Virtual Address Space*), vùng nhớ *Heap*, chu kỳ quét của bộ thu gom rác (*GC Pause*) và bể luồng (*Thread Pool*) của thuê bao này hoàn toàn cách ly khỏi các thuê bao khác. Nếu một khách hàng lớn thực hiện thao tác tính toán báo cáo tổng hợp cực nặng hoặc mở đồng thời 5.000 kết nối WebSocket làm tiêu tốn 100% CPU trên tiến trình của họ, độ trễ phản hồi kéo thả thẻ Kanban của các thuê bao khác hoàn toàn không bị ảnh hưởng. Tuy nhiên, cái giá phải trả là mỗi tiến trình runtime (đặc biệt như JVM hay Node.js) đều tiêu tốn một lượng bộ nhớ RAM cơ sở cố định ngay cả khi không có người dùng truy cập, làm giảm mạnh mật độ đóng gói trên mỗi máy chủ.
2. **Phương án Gộp tại Tầng 8 (*Shared Stateless Runtime Pool*):**
   Toàn bộ các thuê bao (hoặc hàng nghìn thuê bao trong cùng một *Cell*) cùng chia sẻ chung một cụm các tiến trình ứng dụng được thiết kế **hoàn toàn không lưu trạng thái cục bộ (*Stateless Application Pool*)**. Bên trong cùng một tiến trình đang chạy, tại cùng một mili-giây, `Luồng thực thi #1 (Worker Thread 1)` có thể đang xử lý yêu cầu di chuyển thẻ Kanban cho `tenant_alpha (gói PRO)`, trong khi ngay bên cạnh nó trên cùng vùng nhớ *Heap*, `Luồng thực thi #2 (Worker Thread 2)` đang xử lý yêu cầu tạo bảng mới cho `tenant_beta (gói FREE)`.
   Để hai luồng thực thi nằm chung trong một không gian bộ nhớ RAM không bao giờ làm rò rỉ dữ liệu sang nhau, phương án Gộp tại Tầng 8 bắt buộc phải tuân thủ nghiêm ngặt ba quy tắc kỹ thuật:
   * **Đóng gói Ngữ cảnh Cô lập theo Luồng (*Thread-Isolated Context Container*):** Định danh và thông tin gói cước của thuê bao phải được lưu trong cấu trúc bộ nhớ gắn chặt với luồng hoặc chuỗi bất đồng bộ hiện tại (như `ThreadLocal` / `ScopedValue` trong Java, `AsyncLocalStorage` trong Node.js, hoặc `context.Context` trong Go).
   * **Cấm tuyệt đối Biến Tĩnh Toàn cục Không Phân vùng (*Zero Unpartitioned Static/Global State*):** Nghiêm cấm việc lưu trữ tạm bất kỳ đối tượng dữ liệu nghiệp vụ nào vào các biến `static`, `Singleton` hoặc bộ nhớ đệm toàn cục trong tiến trình mà không có khóa phân vùng `tenant_id`.
   * **Cơ chế Tự làm sạch Bắt buộc trong Khối `finally` (*Mandatory Context Sanitization*):** Vì các luồng xử lý sau khi hoàn tất một yêu cầu HTTP sẽ được trả về *Thread Pool* để tái sử dụng ngay cho yêu cầu tiếp theo của một thuê bao khác, mọi luồng bắt buộc phải đi qua chốt chặn `try ... finally { TenantContext.clear(); }` để xóa trắng ngữ cảnh trước khi rời tiến trình.

#### **2.3.5.3. Chiến lược tại Tầng 9 (Application Code & Logical Configuration): Tính Bất biến của *Single Codebase* và Cơ chế Tùy biến Động**
Khi bước lên đỉnh cao nhất của ngăn xếp tại **Tầng 9**, quy tắc kiến trúc quan trọng bậc nhất cần được khẳng định là: **Trong một hệ thống SaaS Đa thuê bao đích thực (đạt Cấp độ trưởng thành 3 và 4 của Chong & Carraro như đã định vị ở Chương 1), phần Mã nguồn Cốt lõi (*Application Core Codebase*) tại Tầng 9 BẮT BUỘC PHẢI ĐƯỢC GỘP 100% (*Single Codebase*) trong mọi kịch bản!**

Tại sao Tầng 9 tuyệt đối không được phép "Tách nhánh mã nguồn" (*Code Branching / Forking per Tenant*, ví dụ tạo nhánh Git `branch-customer-A`, `branch-customer-B`)? Bởi vì ngay khoảnh khắc nhà cung cấp nhân bản mã nguồn thành $N$ nhánh riêng để sửa mã theo ý từng khách hàng, chi phí vá lỗi bảo mật, kiểm thử hồi quy và nâng cấp tính năng sẽ tăng bùng nổ theo cấp số nhân $O(N)$, đẩy hệ thống thoái hóa ngược về Cấp độ trưởng thành 1 (*Ad-hoc/Custom*) và đánh mất bản chất của SaaS.

Như vậy, tại Tầng 9, khái niệm **Gộp** và **Tách** được định nghĩa chuẩn xác như sau:
* **Phần Gộp Bất biến (*Shared Core Codebase*):** Toàn bộ các thuê bao (dù đang chạy trên cụm *Pool* ở Tầng 8 hay đang chạy trên cụm *Dedicated Silo* riêng biệt) đều thực thi từ **cùng một bản đóng gói mã nguồn chuẩn duy nhất (*Single Build Artifact / Container Image*)**. Trong mã nguồn đó tuyệt đối không tồn tại các câu lệnh rẽ nhánh cứng theo định danh khách hàng kiểu `if (tenantId == "company_A")`.
* **Phần Tách Hợp lệ về mặt Logic Cấu hình (*Isolated Logical Configuration, Dynamic Feature Flags & Sandboxed Extensions*):** Thay vì sửa mã nguồn, sự khác biệt về hành vi nghiệp vụ và giao diện giữa các thuê bao được **Tách biệt ở tầng Siêu dữ liệu và Cấu hình Logic** thông qua ba cơ chế (minh họa ở nửa trên của **Hình 2.9b**):
  1. **Đánh giá Cờ Tính năng Động theo Ngữ cảnh (*Dynamic Feature Flags qua chuẩn OpenFeature*):** Mã nguồn chuẩn gọi hàm đánh giá $\text{FlagValue} = f(\text{FlagKey}, \text{TenantContext}, \text{Ruleset})$ lúc chạy để quyết định bật hay tắt các mô-đun nâng cao (ví dụ: chỉ bật tính năng kiểm tra giới hạn *WIP Limit* trên cột Kanban hoặc tính năng *Sub-tasks* khi ngữ cảnh của thuê bao có `tier = 'PRO' | 'ENTERPRISE'`).
  2. **Cấu hình Siêu dữ liệu và Chính sách Phân quyền theo Thuê bao (*Tenant Metadata & RBAC/ABAC*):** Mỗi thuê bao sở hữu một không gian siêu dữ liệu riêng để tự định nghĩa các trường thuộc tính mở rộng trên thẻ công việc (`JSONB Custom Fields`: như độ ưu tiên, điểm ước lượng *Story Points*, ngày hết hạn), định nghĩa hạn mức sử dụng (*Quota*: số bảng tối đa, dung lượng đính kèm tối đa) và ma trận phân quyền vai trò riêng trong tổ chức của mình.
  3. **Môi trường Cát hộp cho Kịch bản Mở rộng (*Plugin / Webhook Sandbox*):** Đối với các khách hàng doanh nghiệp có nhu cầu chạy các quy tắc tự động hóa riêng (ví dụ: *"Khi thẻ Kanban được kéo sang cột DONE thì tự động gọi API sang hệ thống ERP nội bộ"*), Tầng 9 tách biệt các kịch bản này thành các cấu hình *Webhook / Serverless Plugin* chạy trong môi trường cát hộp cô lập hoàn toàn với mã nguồn lõi.

![Hình 2.9b: Zoom-in Tầng 8 & Tầng 9 – Cơ chế Gộp Mã nguồn Duy nhất (Single Codebase), Cô lập Ngữ cảnh Luồng tại Tầng Thực thi và Tùy biến Động theo Thuê bao](../diagrams/diagrams_C2/png/hinh_2_9b_app_runtime_codebase.drawio.png)

*Hình 2.9b: Zoom-in Tầng 8 & Tầng 9 – Cơ chế Gộp Mã nguồn Duy nhất (Single Codebase), Cô lập Ngữ cảnh Luồng tại Tầng Thực thi và Tùy biến Động theo Thuê bao. (Bản vẽ chuẩn hóa XML: [hinh_2_9b_app_runtime_codebase.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_9b_app_runtime_codebase.drawio))*

Quan sát **Hình 2.9b**, sơ đồ làm nổi bật mối quan hệ tổng hòa giữa Tầng 9 và Tầng 8: từ **Khối Mã nguồn Nghiệp vụ Duy nhất (`Single Codebase` – khung liền xanh lá ở đỉnh Tầng 9)** kết hợp với ba mô-đun cấu hình động (`OpenFeature`, `Metadata/RBAC`, `Plugin Sandbox`), cùng một bản đóng gói phần mềm chuẩn (*Artifact*) có thể vừa được triển khai xuống **Nhánh Trái tại Tầng 8 (`Shared Stateless Runtime Pool` – khung liền xanh lá)** nơi các luồng của `t_alpha` và `t_beta` chạy song song trong các hộp ngữ cảnh `ThreadLocal/AsyncLocalStorage` nét đứt độc lập, vừa có thể được triển khai xuống **Nhánh Phải tại Tầng 8 (`Dedicated Runtime Silo` – khung nét đứt màu đỏ)** dành riêng cho khách hàng VIP có vùng nhớ *Heap*, *GC* và *Thread Pool* tách biệt hoàn toàn.

#### **2.3.5.4. Ánh xạ Chiều Ranh giới Thuê bao (B1, B3, B4) và Bàn luận Đánh đổi tại Tầng 8 – 9**
Sự phân định rõ ràng giữa Tầng 8 và Tầng 9 trên **Hình 2.9b** giúp giải thích tường minh vì sao hai tầng đỉnh ngăn xếp lại nắm giữ các chiều ranh giới khác nhau:
* **Tại Tầng 8 (Application Runtime) – Trọng tâm là Chiều B1 (Bảo toàn Ngữ cảnh Định danh trên Luồng) và Chiều B3 (Cô lập Hiệu năng Bộ nhớ/CPU):**
  + *Đối với Chiều B1:* Khi hàng trăm luồng xử lý đan xen trong cùng một tiến trình ứng dụng gộp, Tầng 8 là nơi duy trì tính toàn vẹn của đối tượng `TenantContext` từ lúc nhận yêu cầu ở Controller, đi qua các lớp Service nghiệp vụ cho tới lúc gọi xuống Repository CSDL, đồng thời dọn sạch ngữ cảnh bằng `finally { TenantContext.clear(); }` để chống rò rỉ định danh giữa các luồng.
  + *Đối với Chiều B3:* Trong tiến trình dùng chung ở Tầng 8, vùng nhớ *Heap* là tài nguyên nhạy cảm nhất. Nếu một thuê bao gửi yêu cầu truy vấn 100.000 thẻ Kanban cùng lúc mà không bị giới hạn phân trang (*Pagination Cap*) hoặc tải lên một chuỗi JSON khổng lồ làm đầy bộ nhớ *Heap*, bộ thu gom rác (*Garbage Collector*) sẽ kích hoạt trạng thái dừng toàn bộ tiến trình (*Stop-The-World GC Pause*) hoặc gây lỗi tràn bộ nhớ (`OutOfMemoryError`), làm đóng băng mọi luồng của các thuê bao khác đang chạy chung trên Pod đó. Do đó, Tầng 8 bảo vệ Chiều B3 bằng cách tách Pod riêng (ở phương án *Silo*) hoặc áp đặt trần phân trang và giới hạn kích thước tải trọng nghiêm ngặt theo từng yêu cầu (ở phương án *Pool*).
* **Tại Tầng 9 (Application Code & Logical Configuration) – Trọng tâm là Chiều B1 (Ủy quyền Nghiệp vụ) và Chiều B4 (Cô lập Cấu hình & Tùy biến Động):**
  + *Đối với Chiều B1:* Sau khi Tầng 7 và Tầng 8 đã xác định được *"Người gọi thuộc thuê bao nào"*, mã nguồn nghiệp vụ tại Tầng 9 thực thi bước kiểm tra quyền hạn chi tiết (*Fine-grained Authorization – RBAC/ABAC*) để xác nhận người dùng đó có quyền thực hiện thao tác cụ thể (như xóa bảng Kanban hay thay đổi cấu hình WIP Limit) bên trong thuê bao đó hay không.
  + *Đối với Chiều B4:* Tầng 9 chính là không gian hiện thực hóa trọn vẹn nhất của **Chiều B4**. Toàn bộ cơ chế đánh giá cờ tính năng động *OpenFeature*, cấu hình trường mở rộng `JSONB` và hạn mức gói cước tại Tầng 9 cho phép mỗi thuê bao nhìn thấy và vận hành một "phiên bản logic riêng biệt" của phần mềm trên nền tảng một bộ mã nguồn vật lý duy nhất.

---

### **2.3.6. Bảng Ma trận Tổng hợp Chiến lược Tách – Gộp qua 9 Tầng Ngăn xếp**

Khép lại toàn bộ hành trình giải phẫu đi từ Tầng 1 lên đến Tầng 9 tại các Mục 2.3.1 – 2.3.5, chúng ta nhận thấy mỗi tầng trong ngăn xếp 9 tầng đóng góp một mắt xích không thể thay thế trong việc định hình độ dày ranh giới và bảo vệ 4 chiều cô lập (B1–B4). **Bảng 2.3** đúc kết toàn bộ không gian thiết kế của 9 tầng thành một **Ma trận Tham chiếu Chiến lược Tách – Gộp Toàn diện**, tổng hợp trực tiếp các phương án cấu trúc, cơ chế kỹ thuật bảo vệ vách ngăn và các chiều ranh giới trọng tâm đã được phân tích ở từng mục con phía trên.

*Bảng 2.3: Ma trận tổng hợp chiến lược Tách (Isolation) và Gộp (Sharing) xuyên suốt 9 tầng ngăn xếp Cloud-Native.*

| Tầng Ngăn xếp | Tên Tầng Thành phần | Phương án **Tách (Isolated / Dedicated)** | Phương án **Gộp (Shared / Pooled)** | Cơ chế Kỹ thuật Bảo vệ Vách ngăn khi Gộp | Chiều Ranh giới Trọng tâm *(Đã phân tích tại 2.3.1–2.3.5)* |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **Tầng 9** | **Mã nguồn & Cấu hình Logic** *(App Code & Config)* | Cấu hình Metadata riêng, tập quy tắc Flag riêng, Plugin Sandbox riêng *(Không phân nhánh mã nguồn gốc)*. | Bộ mã nguồn nghiệp vụ duy nhất (*Single Codebase*) phục vụ mọi thuê bao. | Đánh giá cờ tính năng động (*OpenFeature*), phân quyền RBAC/ABAC theo `tenant_id`, kiểm tra *Quota* gói cước. | **B1, B4** *(Mục 2.3.5.4)* |
| **Tầng 8** | **Thực thi Ứng dụng** *(Application Runtime)* | Tiến trình / Container / Pod ứng dụng riêng biệt cho từng thuê bao (*Dedicated Runtime Silo*). | Cụm tiến trình không trạng thái dùng chung (*Shared Stateless App Pool*). | Cô lập ngữ cảnh luồng (`ThreadLocal` / `AsyncLocalStorage`), cấm biến tĩnh toàn cục, `finally { clear(); }`, giới hạn *Pagination/Heap*. | **B1, B3** *(Mục 2.3.5.4)* |
| **Tầng 7** | **Phần mềm Trung gian** *(Middleware)* | API Gateway riêng, cụm Redis riêng, Kafka Topic / RabbitMQ `vhost` riêng. | API Gateway chung, cụm Redis chung, hàng đợi sự kiện chung. | Xác thực JWT tại biên, *Tier-Aware Routing*, *Per-Tenant Rate Limiting*, tiền tố khóa `tenant:{id}:*`, *Fair Queueing*. | **B1, B3, B4** *(Hỗ trợ B2 Cache – Mục 2.3.4.4)* |
| **Tầng 6** | **Cơ sở Dữ liệu Logic** *(Database & Schema)* | Cơ sở dữ liệu riêng (*Database-per-Tenant*) hoặc Lược đồ riêng (*Schema-per-Tenant*). | Bảng dữ liệu dùng chung (*Shared-Table*) có cột khóa phân vùng `tenant_id`. | Chính sách **Row-Level Security (RLS)** (`ENABLE` + `FORCE` + `USING` + `WITH CHECK`), chuyển mạch `SET LOCAL`. | **B2** *(Hỗ trợ B4 JSONB – Mục 2.3.3.5)* |
| **Tầng 5** | **Hệ Quản trị CSDL** *(DBMS Instance)* | Tiến trình máy chủ DBMS riêng biệt (*Dedicated PostgreSQL/MySQL Server*). | Cụm máy chủ DBMS dùng chung (*Shared DBMS Primary + Read Replicas*). | Quản lý *Connection Pool* ở chế độ giao dịch (*Transaction Pooling*), cô lập biến phiên `SET LOCAL`, giới hạn `statement_timeout`. | **B2, B3** *(Mục 2.3.3.5)* |
| **Tầng 4** | **Lưu trữ Đám mây** *(Cloud Storage)* | Bucket S3 riêng (*Bucket-per-Tenant*), ổ đĩa EBS riêng và khóa mã hóa KMS riêng (*BYOK*). | Bucket S3 dùng chung (*Shared Bucket*) và hệ thống lưu trữ dùng chung. | Phân vùng tiền tố đường dẫn (`tenants/{id}/...`), cấp phát *Short-Lived Pre-signed URL*, *IAM Session Policy*. | **B2** *(Phối hợp B1, B3 – Mục 2.3.2.4)* |
| **Tầng 3** | **Ảo hóa & Container** *(Virtualization & K8s)* | Máy ảo (VM) riêng, cụm Kubernetes riêng hoặc *Dedicated Node Pool* riêng. | Cụm Kubernetes dùng chung (*Shared K8s Cluster & Worker Nodes*). | Linux `cgroups`, `namespaces`, Kubernetes `ResourceQuota`, `LimitRange`, *Pod QoS*, *MicroVM (Firecracker/gVisor)*. | **B3** *(Mục 2.3.1.4)* |
| **Tầng 2** | **Hạ tầng Mạng** *(Network Infra)* | Mạng ảo riêng (*Dedicated VPC / VNet*), Subnet riêng, cổng VPN / Direct Connect riêng. | Mạng ảo dùng chung (*Shared VPC*) và bộ cân bằng tải chung. | Chính sách mạng phần mềm (`NetworkPolicy`), mã hóa nội bộ *Service Mesh mTLS*, tường lửa ứng dụng *WAF*. | **B1, B3** *(Mục 2.3.1.4)* |
| **Tầng 1** | **Phần cứng Vật lý** *(Physical Hardware)* | Máy chủ vật lý chuyên dụng (*Bare-Metal / Dedicated Host*). | Hạ tầng máy chủ đám mây công cộng dùng chung (*Multi-Tenant Cloud Hardware*). | Cô lập phần cứng cấp vi xử lý (*AWS Nitro Security Chip / Hardware Security Module – HSM*). | **B2, B3** *(Mục 2.3.1.4)* |

---

## **2.4. Các Kịch bản Phối hợp Tách – Gộp Điển hình trong Thực tế**

Ma trận 9 tầng ở Mục 2.3 về mặt toán học có thể sinh ra $2^9 = 512$ tổ hợp Tách – Gộp lý thuyết. Tuy nhiên, trong thực tiễn công nghiệp phần mềm, phần lớn các tổ hợp ngẫu nhiên là bất khả thi hoặc phi lý về mặt kỹ thuật (ví dụ: không thể Tách riêng máy chủ vật lý ở Tầng 1 nhưng lại Gộp chung tiến trình ứng dụng ở Tầng 8 mà không qua ảo hóa mạng phức tạp). Qua khảo sát các nền tảng SaaS thực tế (như Atlassian Jira Cloud, Linear, Trello, Slack, Shopify và Salesforce), các quyết định thiết kế hội tụ về **ba kịch bản phối hợp nguyên mẫu (*Architectural Archetypes / Profiles*)** đại diện cho ba bài toán kinh doanh – kỹ thuật đặc trưng nhất.

### **2.4.1. Kịch bản 1 – Tối ưu hóa Chi phí Tuyệt đối (*The SMB / Startup Profile* — Mô hình *Full-Stack Pool*)**

#### **2.4.1.1. Bối cảnh Áp dụng và Mục tiêu Trọng tâm**
Kịch bản này xuất hiện phổ biến ở các công ty khởi nghiệp SaaS (*Startups*) hoặc các nền tảng hướng tới phân khúc doanh nghiệp vừa và nhỏ (*SMB*), đội nhóm độc lập và người dùng cá nhân theo mô hình *Product-Led Growth (PLG) / Freemium*. Đặc điểm cốt lõi của bối cảnh này là: số lượng thuê bao $N$ rất lớn (từ vài nghìn đến hàng trăm nghìn tổ chức), nhưng doanh thu trung bình trên mỗi tài khoản (*ARPU*) thấp hoặc bằng 0 ở gói miễn phí, và mô hình truy cập mang tính chất thưa thớt, ngắt quãng (*bursty & sparse traffic*). Mục tiêu sống còn của kiến trúc là **nén chi phí biên $\delta$ về sát mức 0** và đảm bảo tốc độ đăng ký không gian làm việc mới (*Self-Service Onboarding*) diễn ra tức thì.

#### **2.4.1.2. Cấu hình Phối hợp Tách – Gộp trên 9 Tầng và Sơ đồ Kiến trúc**
Để đạt mục tiêu trên, Kịch bản 1 áp dụng chiến lược **Gộp toàn diện (*Full-Stack Pool*) xuyên suốt cả 9 tầng**, kết hợp với vách ngăn cô lập logic nhiều lớp ở Tầng 6, 7, 8 và 9.

![Hình 2.10: Sơ đồ Kiến trúc Kịch bản 1 – The SMB / Startup Profile (Hợp nhất toàn ngăn xếp kết hợp vách ngăn logic đa tầng)](../diagrams/diagrams_C2/png/hinh_2_10_smb_profile.drawio.png)

*Hình 2.10: Sơ đồ Kiến trúc Kịch bản 1 – The SMB / Startup Profile (Hợp nhất toàn ngăn xếp kết hợp vách ngăn logic đa tầng). (Bản vẽ chuẩn hóa XML: [hinh_2_10_smb_profile.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_10_smb_profile.drawio))*

Quan sát **Hình 2.10** và **Bảng 2.4**, luồng yêu cầu từ hàng chục nghìn thuê bao đi qua một ngăn xếp hợp nhất hoàn toàn (biểu diễn bằng các khung nét liền):
1. Tại **Tầng 7 (Middleware)**, cổng `API Gateway` phân giải JWT và áp dụng giới hạn lưu lượng `Rate Limit` trên cụm `Redis L2 Cache` dùng chung (với khóa tiền tố `tenant:{id}:*`).
2. Tại **Tầng 8–9 (Application & Codebase)**, cụm `Stateless App Pool` chạy một bộ mã nguồn duy nhất, lưu ngữ cảnh trong `TenantContext` và gọi bộ đánh giá `FeatureFlags (OpenFeature)` để bật/tắt tính năng theo gói cước (*Free* vs *Pro*).
3. Tại **Tầng 4–6 (Data & Storage)**, toàn bộ bản ghi được lưu trong một cụm `PostgreSQL Shared Tables` được bảo vệ cứng bằng chính sách `RLS Policy` (`SET LOCAL app.current_tenant_id`), còn tệp đính kèm lưu trên một `Shared S3 Bucket` phân tách bằng tiền tố đường dẫn và `Pre-signed URL`.
4. Tại **Tầng 1–3 (Infrastructure)**, toàn bộ hệ thống chạy trên một cụm `Shared Kubernetes Cluster` đặt trong một `Shared VPC`.

*Bảng 2.4: Bảng cấu hình phân bổ tài nguyên 9 tầng của Kịch bản 1 (The SMB / Startup Profile).*

| Tầng | Thành phần Kiến trúc | Chiến lược | Cấu hình Thực thi Cụ thể trong Kịch bản 1 |
| :-: | :--- | :-: | :--- |
| **9** | Application Code & Config | **Gộp (Pool)** | Một bộ mã nguồn duy nhất (*Single Codebase*); tùy biến giới hạn gói cước qua *Feature Flags* & *Metadata*. |
| **8** | Application Runtime | **Gộp (Pool)** | Cụm *Stateless Application Pods* dùng chung; cô lập ngữ cảnh trên bộ nhớ bằng `ThreadLocal` / `AsyncLocalStorage`. |
| **7** | Middleware | **Gộp (Pool)** | *API Gateway* chung, cụm *Redis L2 Cache* chung (tiền tố khóa `tenant:{id}:*`), hàng đợi sự kiện chung. |
| **6** | Database (Logical) | **Gộp (Pool)** | Bảng dùng chung (*Shared-Table*) có cột `tenant_id` dẫn đầu chỉ mục B-Tree; bắt buộc bật **PostgreSQL RLS**. |
| **5** | DBMS | **Gộp (Pool)** | Một cụm máy chủ *PostgreSQL Primary + Read Replicas* dùng chung kết hợp bộ trộn kết nối *PgBouncer / HikariCP*. |
| **4** | Cloud Storage | **Gộp (Pool)** | Một *Shared S3/MinIO Bucket* duy nhất; phân vùng theo tiền tố `tenants/{tenant_id}/` và cấp phát *Pre-signed URL*. |
| **3** | Virtualization & Container | **Gộp (Pool)** | Một cụm *Shared Kubernetes Cluster* tự động co giãn (*Horizontal Pod Autoscaler – HPA*). |
| **2** | Network Infrastructure | **Gộp (Pool)** | Một mạng ảo *Shared VPC* và bộ cân bằng tải *Application Load Balancer (ALB)* dùng chung. |
| **1** | Physical Hardware | **Gộp (Pool)** | Hạ tầng máy chủ đám mây công cộng dùng chung (*Public Cloud Compute Instances*). |

---

### **2.4.2. Kịch bản 2 – Cô lập Nghiêm ngặt vì Tuân thủ Pháp lý (*The Enterprise / Regulated Profile* — Mô hình *Silo* dưới Quản trị Tập trung)**

#### **2.4.2.1. Bối cảnh Áp dụng và Mục tiêu Trọng tâm**
Kịch bản 2 phục vụ các tổ chức tài chính – ngân hàng, cơ sở y tế (tuân thủ *HIPAA*), cơ quan chính phủ hoặc các tập đoàn đa quốc gia có quy định kiểm toán nội bộ bắt buộc: **dữ liệu và tiến trình xử lý không được phép cư trú trên cùng một máy chủ ảo hay cơ sở dữ liệu với bất kỳ tổ chức bên thứ ba nào**, đồng thời phải hỗ trợ định cư dữ liệu theo vùng lãnh thổ (*Data Residency*) và tự quản lý khóa mã hóa (*Customer-Managed Keys – BYOK*).

#### **2.4.2.2. Cấu hình Phối hợp Tách – Gộp trên 9 Tầng và Sơ đồ Kiến trúc**
Điểm tinh tế của Kịch bản 2 nằm ở chỗ: hệ thống **Tách hoàn toàn từ Tầng 1 đến Tầng 8** cho từng khách hàng lớn, nhưng vẫn **Gộp tại Tầng 9 (*Single Codebase & Unified Control Plane*)** để không bị thoái hóa thành phần mềm cài đặt rời rạc (*On-Premises*).

![Hình 2.11: Sơ đồ Kiến trúc Kịch bản 2 – The Enterprise / Regulated Profile (Cô lập hoàn toàn cụm thực thi và lưu trữ dưới sự điều phối của Control Plane chung)](../diagrams/diagrams_C2/png/hinh_2_11_enterprise_profile.drawio.png)

*Hình 2.11: Sơ đồ Kiến trúc Kịch bản 2 – The Enterprise / Regulated Profile (Cô lập hoàn toàn cụm thực thi và lưu trữ dưới sự điều phối của Control Plane chung). (Bản vẽ chuẩn hóa XML: [hinh_2_11_enterprise_profile.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_11_enterprise_profile.drawio))*

Như minh họa trên **Hình 2.11** và **Bảng 2.5**, toàn bộ các cụm Silo của khách hàng đều được sinh tự động từ cùng một kho mã nguồn và đường ống `GitOps / Terraform Control Plane` (Tầng 9 dùng chung). Khi đi vào vận hành, mỗi tập đoàn được định tuyến qua cổng biên về một ngăn xếp dành riêng hoàn toàn (các khung nét đứt trên **Hình 2.11**): cụm `Dedicated App Instance`, bộ nhớ đệm `Dedicated Redis`, máy chủ `Dedicated PostgreSQL Server`, kho lưu trữ `Dedicated S3 Bucket` mã hóa bằng khóa riêng `Dedicated KMS Key (BYOK)` đặt trong một mạng `Dedicated VPC` độc lập.

*Bảng 2.5: Bảng cấu hình phân bổ tài nguyên 9 tầng của Kịch bản 2 (The Enterprise / Regulated Profile).*

| Tầng | Thành phần Kiến trúc | Chiến lược | Cấu hình Thực thi Cụ thể trong Kịch bản 2 |
| :-: | :--- | :-: | :--- |
| **9** | Application Code & Config | **Gộp mã nguồn / Tách cấu hình** | **Duy trì một bộ mã nguồn chuẩn duy nhất (*Single Codebase*)** điều phối qua *Unified Control Plane*; cấu hình chính sách bảo mật riêng cho từng tập đoàn. |
| **8** | Application Runtime | **Tách (Silo)** | Cụm tiến trình ứng dụng riêng biệt (*Dedicated Application Pods/Instances*) cho từng thuê bao. |
| **7** | Middleware | **Tách (Silo)** | Cổng Ingress/WAF riêng, thực thể *Redis Cache* riêng và hàng đợi thông điệp riêng biệt. |
| **6** | Database (Logical) | **Tách (Silo)** | Cơ sở dữ liệu vật lý/logic độc lập hoàn toàn (*Dedicated Database*) cho từng thuê bao. |
| **5** | DBMS | **Tách (Silo)** | Máy chủ hệ quản trị CSDL riêng biệt (*Dedicated RDS / PostgreSQL Instance*) với cấu hình sao lưu độc lập. |
| **4** | Cloud Storage | **Tách (Silo)** | *Dedicated S3 Bucket* và ổ đĩa mã hóa bằng khóa *Customer-Managed KMS Key (BYOK)* riêng của khách hàng. |
| **3** | Virtualization & Container | **Tách (Silo)** | Nhóm máy ảo riêng (*Dedicated VM / EKS Node Group*) hoặc cụm Kubernetes riêng biệt. |
| **2** | Network Infrastructure | **Tách (Silo)** | Không gian mạng ảo riêng (*Dedicated VPC*), kết nối *PrivateLink / VPN* riêng biệt về mạng nội bộ khách hàng. |
| **1** | Physical Hardware | **Tách hoặc Gộp có cô lập cứng** | Máy chủ chuyên dụng (*Dedicated Hosts*) hoặc cô lập phần cứng cấp trình quản lý ảo hóa (*AWS Nitro*) tại vùng địa lý chỉ định. |

---

### **2.4.3. Kịch bản 3 – Phân bổ Hỗn hợp Đa phân khúc và Khoanh vùng theo Ô (*The Tiered Platform & Cell-Based Profile* — Mô hình *Hybrid + Bridge + Cell-Based*)**

#### **2.4.3.1. Bối cảnh Áp dụng và Bài toán Bán kính Sự cố ở Quy mô Lớn**
Khi một nền tảng SaaS B2B phát triển tới giai đoạn trưởng thành (phục vụ đồng thời hàng chục nghìn thuê bao *Free/Pro*, hàng trăm thuê bao *Business* và hàng chục tập đoàn *Enterprise*), việc chỉ dùng đơn lẻ Kịch bản 1 (*Full Pool*) hay Kịch bản 2 (*Full Silo*) đều bộc lộ giới hạn:
1. **Nhu cầu Phân tầng theo Giá trị Thương mại (*Tiered Value Proposition*):** Khách hàng ở các bậc giá khác nhau đòi hỏi độ dày ranh giới cô lập khác nhau trên cùng một nền tảng.
2. **Rủi ro Điểm lỗi Đơn lẻ Toàn cục (*Global Blast Radius*) của Cụm Pool Khổng lồ:** Nếu gom toàn bộ 100.000 thuê bao *Free/Pro* vào một cụm *Pool* duy nhất (1 cụm App + 1 cụm DB khổng lồ), một sự cố hỏng hóc phần cứng, một lỗi nâng cấp phiên bản hoặc một cuộc tấn công từ chối dịch vụ (DDoS) vượt ngưỡng sẽ đánh sập 100% khách hàng của công ty cùng một lúc.

Để giải quyết đồng thời hai thách thức này, các nền tảng SaaS hàng đầu thế giới kết hợp mô hình **Hybrid / Bridge phân tầng** với mẫu kiến trúc **Chia theo Ô Độc lập (*Cell-Based Architecture*)** (AWS, 2024).

#### **2.4.3.2. Cấu hình Phối hợp Đa tầng và Sơ đồ Kiến trúc *Cell-Based***
Trong kiến trúc **Cell-Based**, thay vì xây dựng một cụm *Pool* khổng lồ duy nhất, nhà cung cấp chia hệ thống thành nhiều **Ô kiến trúc tự chứa hoàn chỉnh (*Self-Contained Cells*: `Cell 01`, `Cell 02`, ..., `Cell K`)**. Mỗi *Cell* là một bản sao thu nhỏ đầy đủ từ Tầng 3 đến Tầng 8 (có cụm App riêng, Cache riêng, DBMS riêng) và chỉ phục vụ một số lượng thuê bao giới hạn xác định (ví dụ: mỗi *Cell* chứa tối đa 1.000 thuê bao *Free/Pro*, trong khi một thuê bao *Enterprise VIP* có thể sở hữu trọn vẹn một *Dedicated Cell* riêng).

![Hình 2.12: Sơ đồ Kiến trúc Kịch bản 3 – Cell-Based Architecture kết hợp Phân tầng Đa thuê bao nhằm giới hạn Bán kính Ảnh hưởng Sự cố (Blast Radius)](../diagrams/diagrams_C2/png/hinh_2_12_cell_based_profile.drawio.png)

*Hình 2.12: Sơ đồ Kiến trúc Kịch bản 3 – Cell-Based Architecture kết hợp Phân tầng Đa thuê bao nhằm giới hạn Bán kính Ảnh hưởng Sự cố (Blast Radius). (Bản vẽ chuẩn hóa XML: [hinh_2_12_cell_based_profile.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_12_cell_based_profile.drawio))*

Quan sát **Hình 2.12**, mọi yêu cầu đi vào tầng định tuyến biên mỏng (`Global Ingress & Tenant Cell Router` – khung nét liền màu xanh dương). Bộ định tuyến tra cứu bảng ánh xạ phân vùng (`Partition Mapping Table` theo hàm băm `hash(tenant_id)` hoặc theo `tier`):
* Các thuê bao từ `Tenant 1` đến `Tenant 1.000` được định tuyến cố định vào **CELL 01 (Khung nét đứt độc lập bên trái)** gồm `App Pool 1` $\rightarrow$ `Redis 1` $\rightarrow$ `DB 1 (RLS)`.
* Các thuê bao từ `Tenant 1.001` đến `Tenant 2.000` được định tuyến cố định vào **CELL 02 (Khung nét đứt độc lập bên phải)** gồm `App Pool 2` $\rightarrow$ `Redis 2` $\rightarrow$ `DB 2 (RLS)`.
* Giữa `Cell 01` và `Cell 02` **tuyệt đối không chia sẻ trạng thái vật lý (*Share-Nothing between Cells*)**. Nhờ đó, nếu `Cell 01` gặp sự cố quá tải CSDL hoặc lỗi triển khai phần mềm (*Canary Deployment*), bán kính thiệt hại (*Blast Radius*) bị khóa chặt ở mức $1/K$ tổng số khách hàng, còn `Cell 02` vẫn hoạt động bình thường 100%.

**Bảng 2.6** trình bày chi tiết cấu hình phân bổ tài nguyên hỗn hợp đa tầng của Kịch bản 3 cho ba phân khúc thuê bao (*Free/Pro*, *Business* và *Enterprise*) vận hành trên kiến trúc phân tầng và phân ô (*Tiered & Cell-Based Platform*).

*Bảng 2.6: Bảng cấu hình phân bổ tài nguyên 9 tầng của Kịch bản 3 (The Tiered Platform & Cell-Based Profile).*

| Tầng | Thành phần Kiến trúc | Chiến lược Tổng thể | Cấu hình cho Phân khúc **Free / Pro (SMB)** | Cấu hình cho Phân khúc **Business (Mid-Market)** | Cấu hình cho Phân khúc **Enterprise (VIP)** |
| :-: | :--- | :-: | :--- | :--- | :--- |
| **9** | Application Code & Config | **Gộp Mã nguồn / Phân tầng Flag** | Chung 1 bộ mã nguồn (*Single Codebase*); giới hạn tính năng cơ bản qua *Feature Flags*. | Chung bộ mã nguồn; mở khóa tính năng nâng cao (*WIP Limit, Automation*) qua *Feature Flags*. | Chung bộ mã nguồn; mở toàn bộ tính năng VIP, cấu hình bảo mật & *Audit Log* riêng. |
| **8** | Application Runtime | **Hybrid theo Cell** | Dùng chung `App Pool` bên trong một *Shared Cell* (mỗi Cell 1.000 thuê bao). | Dùng chung `App Pool` ưu tiên cao (hoặc nhóm Worker riêng) trong *Cell*. | Cụm tiến trình ứng dụng riêng biệt (*Dedicated App Silo / Dedicated Cell*). |
| **7** | Middleware | **Gộp Định tuyến / Phân tầng Quota** | Đi qua *Global Cell Router*; dùng chung Redis & Queue trong Cell với *Rate Limit* chặt. | Đi qua *Global Cell Router*; dùng chung Redis trong Cell với hạn mức *Rate Limit* cao. | Định tuyến thẳng về *Dedicated Cell*; không gian Cache và Queue dành riêng. |
| **6** | Database (Logical) | **Hybrid (Shared-Table / Schema / DB)** | Bảng dùng chung (**Shared-Table + RLS**) bên trong Database của *Shared Cell*. | Lược đồ riêng (**Dedicated Schema-per-Tenant / Bridge**) để hỗ trợ sao lưu & tùy biến. | Cơ sở dữ liệu độc lập hoàn toàn (**Dedicated Database**). |
| **5** | DBMS | **Phân tách theo Cell / Tier** | Dùng chung cụm *PostgreSQL DBMS* của *Shared Cell* tương ứng. | Dùng chung cụm *PostgreSQL DBMS* hiệu năng cao của phân khúc *Business*. | Máy chủ hệ quản trị CSDL riêng biệt (*Dedicated DBMS Instance*). |
| **4** | Cloud Storage | **Hybrid (Prefix vs. Bucket)** | Dùng chung *Bucket* của Cell, phân tách bằng tiền tố `tenants/{id}/` & *Pre-signed URL*. | Dùng chung *Bucket* theo vùng, phân tách tiền tố kèm khóa mã hóa riêng. | *Dedicated S3 Bucket* riêng biệt với khóa mã hóa *BYOK KMS* riêng. |
| **3** | Virtualization & Container | **Phân tách theo Cell** | Các *Namespace / Node Pool* được đóng gói độc lập theo từng *Cell*. | *Node Pool* có cam kết tài nguyên (*Guaranteed QoS*) theo *Cell*. | Cụm nút tính toán hoặc cụm Kubernetes dành riêng cho *Enterprise Cell*. |
| **2** | Network Infrastructure | **Hybrid (Shared vs. Isolated VPC)** | Mạng *VPC* dùng chung cho từng *Cell* độc lập. | Mạng *VPC* của *Cell* kết hợp danh sách kiểm soát truy cập IP (*IP Whitelisting*). | *Dedicated VPC* riêng biệt có kết nối *VPN / PrivateLink* riêng. |
| **1** | Physical Hardware | **Đám mây Đa vùng** | Hạ tầng đám mây công cộng tiêu chuẩn. | Hạ tầng đám mây công cộng hiệu năng cao. | Máy chủ chuyên dụng (*Dedicated Hosts*) hoặc vùng địa lý theo yêu cầu pháp lý. |

---

### **2.4.4. Nhận xét Tổng hợp: Ma trận Ánh xạ Kịch bản – 9 Tầng và Hai Quy luật Kiến trúc**

Khi đặt ba kịch bản thực tế trên cạnh nhau trong **Bảng 2.7**, chúng ta có thể nhìn thấy một bức tranh tổng thể vô cùng sáng rõ về cách các quyết định Tách – Gộp ở từng tầng hội tụ thành các hình thái kiến trúc công nghiệp.

*Bảng 2.7: Ma trận đối chiếu tổng hợp chiến lược phân bổ trên 9 tầng giữa 3 kịch bản điển hình.*

| Tầng Ngăn xếp | Kịch bản 1: **SMB / Startup Profile** *(Mô hình Full-Stack Pool)* | Kịch bản 2: **Enterprise / Regulated Profile** *(Mô hình Managed Silo)* | Kịch bản 3: **Tiered & Cell-Based Platform** *(Mô hình Hybrid + Bridge + Cell)* |
| :--- | :---: | :---: | :---: |
| **Tầng 9: App Code & Config** | **Gộp** *(Single Codebase + Flags)* | **Gộp Mã nguồn** *(Tách Config)* | **Gộp Mã nguồn** *(Phân tầng Feature Flags)* |
| **Tầng 8: Application Runtime** | **Gộp** *(Shared Stateless Pool)* | **Tách** *(Dedicated App Silo)* | **Lai ghép** *(Pooled theo Cell / Silo cho VIP)* |
| **Tầng 7: Middleware** | **Gộp** *(Shared Gateway, Cache, Queue)* | **Tách** *(Dedicated Middleware)* | **Gộp Định tuyến Biên** + **Tách theo Cell/Tier** |
| **Tầng 6: Database (Logical)** | **Gộp** *(Shared-Table + RLS)* | **Tách** *(Dedicated Database)* | **Đa chế độ** *(RLS / Schema Bridge / Dedicated DB)* |
| **Tầng 5: DBMS** | **Gộp** *(Shared DBMS Cluster)* | **Tách** *(Dedicated DBMS Server)* | **Tách theo từng Cell và Phân khúc** |
| **Tầng 4: Cloud Storage** | **Gộp** *(Shared Bucket + Prefix)* | **Tách** *(Dedicated Bucket + BYOK)* | **Lai ghép** *(Shared Prefix vs. Dedicated Bucket)* |
| **Tầng 3: Virtualization / K8s** | **Gộp** *(Shared K8s Cluster)* | **Tách** *(Dedicated VM / Node Group)* | **Tách theo ranh giới từng Cell** |
| **Tầng 2: Network Infra** | **Gộp** *(Shared VPC)* | **Tách** *(Dedicated VPC + PrivateLink)* | **Tách VPC theo Cell / Dedicated VPC cho VIP** |
| **Tầng 1: Physical Hardware** | **Gộp** *(Public Cloud Hardware)* | **Tách / Cô lập phần cứng** | **Đa vùng / Linh hoạt theo gói SLA** |

Từ ma trận tổng hợp trên, nghiên cứu đúc kết **hai quy luật kiến trúc nền tảng** chi phối mọi hệ thống đa thuê bao hiện đại:

1. **Quy luật 1 – Tính Bất biến của Bộ Mã nguồn Duy nhất tại Đỉnh Ngăn xếp (The Single-Codebase Invariance Law):** Dù hệ thống có phân tách sâu đến mức nào ở các tầng bên dưới (từ Kịch bản 1 sang Kịch bản 2 và Kịch bản 3), **Tầng 9 (Mã nguồn Ứng dụng) luôn luôn được Gộp chung (*Single Codebase*)**. Đây là "chốt chặn sinh tử" phân định một kiến trúc SaaS Đa thuê bao hiện đại (kể cả khi triển khai theo hình thái *Silo* hay *Cell-Based*) với các hệ thống phần mềm đóng gói đơn thuê bao cổ điển.
2. **Quy luật 2 – Sự Dịch chuyển Trọng tâm từ "Cô lập Vật lý Tĩnh" sang "Cô lập Ngữ cảnh Động ở Tầng Phần mềm" (The Software-Defined Boundary Shift):** Khi một nền tảng dịch chuyển từ cấu hình *Silo* (Kịch bản 2) sang cấu hình *Pool* (Kịch bản 1 và các *Shared Cell* của Kịch bản 3) để tối ưu hóa TCO, các vách ngăn vật lý ở Tầng 1–5 được gỡ bỏ. Khi đó, **toàn bộ gánh nặng bảo toàn ranh giới thuê bao không hề mất đi mà dồn nén trực tiếp lên các cơ chế kiểm soát phần mềm lúc chạy tại Tầng 6, 7, 8 và 9**. Chỉ cần một mắt xích nhỏ trong luồng thực thi phần mềm làm rơi ngữ cảnh hoặc bỏ sót bộ lọc, toàn bộ kiến trúc *Pool* sẽ sụp đổ. Nhận thức này dẫn dắt trực tiếp nghiên cứu đi vào Mục 2.5: giải phẫu chi tiết 4 cơ chế kỹ thuật cốt lõi bảo vệ hệ thống lúc chạy.

---

## **2.5. Các Cơ chế Kỹ thuật Cốt lõi Đảm bảo Vận hành Đa thuê bao**

Nếu như các Mục 2.2, 2.3 và 2.4 đã giải quyết bài toán **Cấu trúc Tĩnh (*Static Topology*)** của kiến trúc đa thuê bao, thì Mục 2.5 đi sâu vào **Hành vi Động lúc Chạy (*Runtime Execution Mechanics*)** bên trong Phân vùng Nhận thức Thuê bao (Tầng 6 đến Tầng 9). Để một cụm thực thể ứng dụng và cơ sở dữ liệu dùng chung (*Pool*) có thể phục vụ hàng nghìn yêu cầu đồng thời từ các tổ chức khác nhau mà không xảy ra bất kỳ sự nhiễm bẩn ngữ cảnh (*context contamination*) hay tranh chấp tài nguyên nào, hệ thống bắt buộc phải vận hành nhịp nhàng bốn cơ chế kỹ thuật cốt lõi: **(1) Nhận diện và Lan truyền Ngữ cảnh Thuê bao**, **(2) Cô lập Dữ liệu Thực thi bằng RLS và `SET LOCAL`**, **(3) Bộ nhớ Đệm Hai tầng Nhận thức Thuê bao**, và **(4) Tùy biến Động bằng Cờ Tính năng (*Feature Flags*)**.

### **2.5.1. Cơ chế Nhận diện và Lan truyền Ngữ cảnh Thuê bao (*Tenant Context Resolution & Propagation*)**

Trong một hệ thống đa thuê bao dùng chung tiến trình (Tầng 8), mọi yêu cầu HTTP/REST hoặc thông điệp WebSocket khi đi vào hệ thống đều phải trả lời được câu hỏi đầu tiên: *"Yêu cầu này thuộc về thuê bao nào và có quyền hạn gì?"*. Quá trình này gồm hai pha liên tiếp: **Phân giải ngữ cảnh tại biên (*Context Resolution*)** và **Lan truyền ngữ cảnh xuyên suốt luồng thực thi (*Context Propagation*)**.

#### **2.5.1.1. Phân giải Định danh từ Token Xác thực (JWT Claims) thay vì Tham số Thô từ Client**
Một nguyên tắc bảo mật tối thượng trong thiết kế API đa thuê bao là **Không bao giờ tin tưởng định danh thuê bao do phía Client tự truyền trần trụi qua Query Parameter hoặc Request Body** (ví dụ: `GET /api/boards?tenant_id=t_beta`), bởi kẻ tấn công có thể dễ dàng sửa đổi tham số này để thực hiện tấn công tham chiếu đối tượng trực tiếp không an toàn (*Insecure Direct Object Reference – IDOR*). Thay vào đó, định danh thuê bao phải được trích xuất từ một nguồn đã được ký số mật mã học tại Tầng 7/Tầng 8:
* **Trích xuất từ *JSON Web Token (JWT)* đã xác thực:** Sau khi người dùng đăng nhập và chọn không gian làm việc (*Workspace/Tenant*), máy chủ định danh (*Identity Provider / Auth Service*) cấp phát một thẻ bài JWT được ký bằng thuật toán bất đối xứng (`RS256` hoặc `EdDSA`), bên trong phần tải (*Payload Claims*) đóng gói cứng các thuộc tính: `sub` (định danh người dùng), `tid` hoặc `tenant_id` (định danh thuê bao), `tier` (gói cước: `FREE`, `PRO`, `ENTERPRISE`) và `roles` (vai trò trong thuê bao đó).
* **Kiểm tra chéo khi dùng Tên miền phụ (*Subdomain*) hoặc Tiêu đề HTTP (`X-Tenant-ID`):** Trong trường hợp ứng dụng cho phép truy cập qua tên miền phụ (`acme.kanban-saas.io`) hoặc gửi kèm header `X-Tenant-ID`, bộ lọc bảo mật (*Auth Interceptor / Security Filter*) bắt buộc phải đối chiếu xem `X-Tenant-ID` đó có nằm trong danh sách các thuê bao mà `sub` trong JWT được phép truy cập hay không trước khi khởi tạo ngữ cảnh.

#### **2.5.1.2. Lưu trữ Ngữ cảnh Cô lập theo Luồng và Quy tắc Dọn dẹp Bắt buộc (`try / finally`)**
Sau khi xác thực hợp lệ, bộ lọc đầu vào khởi tạo một đối tượng bất biến `TenantContext(tenantId, tier, userId, roles)` và gắn nó vào vùng nhớ cục bộ của luồng đang xử lý:
* Trong môi trường đa luồng đồng bộ hoặc luồng ảo hiện đại (như Java/Spring Boot, C#/.NET, Go): sử dụng `ThreadLocal<TenantContext>`, `ScopedValue` (Java 21+) hoặc `context.Context` (Go).
* Trong môi trường hướng sự kiện bất đồng bộ một luồng (như Node.js / NestJS / TypeScript): sử dụng cơ chế **`AsyncLocalStorage`** của module `node:async_hooks` để ngữ cảnh tự động bám theo chuỗi lời gọi `Promise / async-await` mà không bị ghi đè bởi các yêu cầu đồng thời khác trên cùng *Event Loop*.

Đặc biệt, vì các máy chủ ứng dụng luôn tái sử dụng luồng từ bể luồng (*Thread Pool*), bộ lọc ngữ cảnh bắt buộc phải bọc toàn bộ chu trình xử lý trong cấu trúc `try ... finally` để gọi lệnh xóa sạch ngữ cảnh (`TenantContextHolder.clear()`) ngay khi yêu cầu kết thúc. Nếu thiếu khối `finally` này, một luồng vừa xử lý xong cho *Tenant A* khi được trả về *Thread Pool* và cấp phát cho một yêu cầu không xác thực hoặc lỗi của *Tenant B* sẽ vô tình mang theo bóng ma ngữ cảnh của *Tenant A*, gây rò rỉ dữ liệu nghiêm trọng.

#### **2.5.1.3. Lan truyền Ngữ cảnh qua các Tác vụ Bất đồng bộ (*Asynchronous & Background Context Propagation*)**
Trong nền tảng SaaS Kanban, rất nhiều tác vụ không thực hiện đồng bộ trong luồng HTTP chính mà được đẩy sang luồng nền hoặc hàng đợi tin nhắn (như gửi thông báo thời gian thực qua WebSocket khi có người di chuyển thẻ, ghi nhật ký hoạt động *Activity Log*, kích hoạt *Webhook* hoặc tính toán thống kê bảng). Khi chuyển giao từ luồng HTTP sang luồng nền (`ExecutorService` / `Worker Thread`) hoặc đẩy vào *Message Queue (Kafka / RabbitMQ / BullMQ)*, vùng nhớ `ThreadLocal` không tự động đi theo. Do đó, hệ thống phải sử dụng **Bộ trang trí ngữ cảnh (*TaskDecorator / Context Propagator*)**:
1. Trước khi đẩy tác vụ vào hàng đợi, tiến trình gửi (*Producer*) chụp lại bản sao `TenantContext` hiện tại và đính kèm vào phần tiêu đề thông điệp (*Message Headers*: `X-Tenant-ID`, `X-Tenant-Tier`, `X-Trace-ID`).
2. Khi tiến trình tiêu thụ (*Consumer / Worker*) lấy thông điệp ra khỏi hàng đợi, một *Consumer Interceptor* đọc phần tiêu đề này, tái tạo lại `TenantContext` trên luồng Worker trước khi gọi hàm xử lý nghiệp vụ và cũng tự động dọn sạch trong khối `finally`.

![Hình 2.13: Biểu đồ tuần tự (Sequence Diagram) cơ chế phân giải JWT, thiết lập `TenantContext`, đánh giá `OpenFeature` và truyền ngữ cảnh đa thuê bao](../diagrams/diagrams_C2/png/hinh_2_13_feature_flags_sequence.drawio.png)

*Hình 2.13: Biểu đồ tuần tự (Sequence Diagram) cơ chế phân giải JWT, thiết lập `TenantContext`, đánh giá `OpenFeature` và truyền ngữ cảnh đa thuê bao. (Bản vẽ chuẩn hóa XML: [hinh_2_13_feature_flags_sequence.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_13_feature_flags_sequence.drawio))*

**Hình 2.13** minh họa trọn vẹn chu trình sống của ngữ cảnh thuê bao trong một yêu cầu tạo bảng công việc mới (`POST /api/boards`): từ lúc `AuthFilter` xác thực JWT và nạp `{tenantId: "t_alpha", tier: "PRO"}` vào `TenantContext`, truyền sang `OpenFeature` để kiểm tra cờ tính năng qua bộ nhớ đệm `L1 Cache (Caffeine)` và `L2 Cache (Redis)`, thực thi truy vấn trong giao dịch CSDL, cho tới bước cuối cùng khi `AuthFilter` gọi lệnh `clear()` để giải phóng hoàn toàn ngữ cảnh trước khi trả kết quả `201 Created` về cho người dùng.

---

### **2.5.2. Cơ chế Cô lập Dữ liệu Thực thi bằng RLS và Quản lý Kết nối `SET LOCAL` (*Database-Level Isolation & Connection Pooling*)**

Khi ngữ cảnh `tenant_id` đã được bảo toàn trên tầng ứng dụng (Tầng 8) và đi xuống tầng Cơ sở dữ liệu dùng chung (Tầng 5–6), thách thức kỹ thuật gay gắt nhất xuất hiện: **Làm thế nào để truyền ngữ cảnh thuê bao xuống tận nhân Hệ quản trị CSDL (PostgreSQL) một cách tuyệt đối an toàn khi hàng nghìn thuê bao đang dùng chung một bể kết nối vật lý (*Shared Connection Pool*)?**

#### **2.5.2.1. Thiết lập Rào chắn Kép trong Nhân PostgreSQL bằng Chính sách *Row-Level Security (RLS)***
Trong cơ sở dữ liệu PostgreSQL, cơ chế *Row-Level Security (RLS)* cho phép định nghĩa các biểu thức điều kiện bảo mật gắn trực tiếp vào bảng vật lý sao cho mọi câu lệnh SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) đều bị nhân CSDL tự động kiểm duyệt ở cấp độ từng dòng bản ghi. Tuy nhiên, để RLS thực sự trở thành một bức tường lửa dữ liệu không thể vượt qua, việc cấu hình DDL phải tuân thủ nghiêm ngặt **ba nguyên tắc kỹ thuật** thể hiện trong đoạn mã chuẩn dưới đây:

```sql
-- 1. Kích hoạt RLS và BẮT BUỘC (FORCE) áp dụng ngay cả với chủ sở hữu bảng (Table Owner)
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards FORCE ROW LEVEL SECURITY;

-- 2. Định nghĩa Chính sách Cô lập Thuê bao Kép (USING cho Đọc/Sửa/Xóa + WITH CHECK cho Ghi/Cập nhật)
CREATE POLICY tenant_isolation_policy ON public.kanban_cards
    AS RESTRICTIVE
    FOR ALL
    TO app_runtime_user
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );
```

Ý nghĩa học thuật và bảo mật của từng mệnh đề trong cấu hình trên:
1. **Tại sao phải có cả `ENABLE` và `FORCE ROW LEVEL SECURITY`?** Mặc định trong PostgreSQL, lệnh `ENABLE ROW LEVEL SECURITY` chỉ áp dụng chính sách lọc đối với các tài khoản người dùng thông thường, nhưng lại **bỏ qua (bypass) đối với chính tài khoản sở hữu bảng (*Table Owner*)**. Trong rất nhiều dự án phần mềm thực tế, lập trình viên dùng chung một tài khoản CSDL vừa để chạy *Migration* tạo bảng (trở thành *Table Owner*), vừa để cấu hình cho ứng dụng kết nối lúc chạy — khiến RLS hoàn toàn bị vô hiệu hóa mà không hề hay biết! Lệnh `FORCE ROW LEVEL SECURITY` khóa chặt lỗ hổng này bằng cách ép buộc ngay cả chủ sở hữu bảng (trừ `superuser` cấp hệ thống) cũng phải chịu sự kiểm soát của RLS.
2. **Tại sao phải tách biệt mệnh đề `USING` và mệnh đề `WITH CHECK`?**
   * Biểu thức `USING (...)` đóng vai trò là **Bộ lọc Đọc (*Read Visibility Filter*)**: nó được tự động nối thêm vào điều kiện `WHERE` của các câu lệnh `SELECT`, `UPDATE` và `DELETE`, đảm bảo tiến trình đang mang ngữ cảnh của *Tenant A* chỉ nhìn thấy và chỉ có thể tác động lên các dòng có `tenant_id = 't_a'`.
   * Biểu thức `WITH CHECK (...)` đóng vai trò là **Chốt chặn Ghi (*Write Integrity Guard*)**: nó kiểm tra giá trị của bản ghi mới sau khi thực hiện `INSERT` hoặc `UPDATE`. Nếu thiếu `WITH CHECK`, một tiến trình đang ở trong phiên của *Tenant A* có thể thực hiện lệnh `INSERT INTO kanban_cards (tenant_id, title) VALUES ('t_b', 'Fake Card')` hoặc `UPDATE kanban_cards SET tenant_id = 't_b'` để tiêm dữ liệu rác sang không gian của *Tenant B*. Khi có `WITH CHECK`, mọi nỗ lực ghi bản ghi mang `tenant_id` khác với ngữ cảnh phiên hiện tại đều bị nhân CSDL từ chối ngay lập tức với lỗi vi phạm chính sách bảo mật.
3. **Nguyên lý Đóng an toàn (*Fail-Closed*) với `current_setting('app.current_tenant_id', true)`:** Tham số thứ hai `missing_ok = true` kết hợp với hàm `NULLIF(..., '')` đảm bảo rằng nếu vì bất kỳ lỗi phần mềm nào mà tầng ứng dụng quên chưa thiết lập biến `app.current_tenant_id` trước khi truy vấn, hàm sẽ trả về giá trị `NULL`. Trong logic ba trị của SQL, phép so sánh `tenant_id = NULL` luôn cho kết quả `UNKNOWN` (tương đương `FALSE` trong bộ lọc), khiến câu truy vấn lập tức trả về **0 bản ghi** thay vì làm lộ dữ liệu.

#### **2.5.2.2. Bài toán Ô nhiễm Phiên trên *Connection Pool* và Giải pháp Giao dịch Nguyên tử với `SET LOCAL`**
Nếu ứng dụng sử dụng câu lệnh thiết lập biến phiên thông thường là `SET app.current_tenant_id = 't_a';` (hoặc `SET search_path TO tenant_a;`), giá trị này sẽ **tồn tại bền vững trong suốt vòng đời của kết nối TCP vật lý đó** cho đến khi kết nối bị đóng hoặc bị ghi đè. Trong kiến trúc sử dụng bể kết nối (*Connection Pool* như *HikariCP* ở tầng ứng dụng hoặc *PgBouncer* ở tầng trung gian), các kết nối vật lý không bao giờ bị đóng sau mỗi yêu cầu mà được trả về bể để cấp phát ngay cho yêu cầu tiếp theo. Nếu một luồng phụ trách *Tenant B* mượn lại đúng kết nối vật lý vừa phục vụ *Tenant A* nhưng do lỗi ngoại lệ mà chưa kịp chạy lệnh `SET` mới, nó sẽ kế thừa nguyên vẹn quyền truy cập dữ liệu của *Tenant A*!

Để triệt tiêu 100% rủi ro ô nhiễm trạng thái kết nối này, kiến trúc đa thuê bao chuẩn mực bắt buộc sử dụng lệnh **`SET LOCAL`** nằm gọn bên trong ranh giới của một giao dịch cơ sở dữ liệu (`BEGIN ... COMMIT / ROLLBACK`):

```sql
BEGIN;
-- Thiết lập biến ngữ cảnh CHỈ CÓ HIỆU LỰC TRONG PHẠM VI GIAO DỊCH HIỆN TẠI
SET LOCAL app.current_tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Mọi câu lệnh SQL nghiệp vụ bên dưới được RLS Engine tự động bảo vệ theo tenant_id trên
SELECT id, title, column_id, position
FROM public.kanban_cards
WHERE board_id = 'b100'
ORDER BY position ASC;

COMMIT; -- Ngay khi COMMIT (hoặc ROLLBACK), PostgreSQL tự động HỦY BỎ biến app.current_tenant_id!
```

![Hình 2.14: Biểu đồ tuần tự (Sequence Diagram) cơ chế cô lập giao dịch bằng `SET LOCAL` và tái sử dụng an toàn kết nối vật lý trong Connection Pool](../diagrams/diagrams_C2/png/hinh_2_14_set_local_sequence.drawio.png)

*Hình 2.14: Biểu đồ tuần tự (Sequence Diagram) cơ chế cô lập giao dịch bằng `SET LOCAL` và tái sử dụng an toàn kết nối vật lý trong Connection Pool. (Bản vẽ chuẩn hóa XML: [hinh_2_14_set_local_sequence.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_14_set_local_sequence.drawio))*

Quan sát **Hình 2.14**, sơ đồ chứng minh tính an toàn tuyệt đối của cơ chế `SET LOCAL` qua hai khung thời gian liên tiếp trên cùng một kết nối vật lý `Conn #1` trong `HikariCP Connection Pool`:
* **Ở Giao dịch 1 (Khung màu xanh dương):** Yêu cầu từ *Tenant A* mượn kết nối `Conn #1`, mở giao dịch `BEGIN`, thực thi `SET LOCAL app.current_tenant_id = 't_a'` và truy vấn `SELECT * FROM tasks`. Khi giao dịch kết thúc bằng lệnh `COMMIT`, nhân PostgreSQL **tự động hủy bỏ biến `app.current_tenant_id`** trở về trạng thái rỗng ban đầu trước khi `Conn #1` được trả về `HikariCP Pool`.
* **Ở Giao dịch 2 (Khung màu tím):** Ngay lập tức sau đó, yêu cầu từ *Tenant B* mượn lại chính kết nối `Conn #1` đó. Lúc này `Conn #1` hoàn toàn sạch trạng thái; giao dịch mới thực thi `BEGIN; SET LOCAL app.current_tenant_id = 't_b';`, đảm bảo *Tenant B* chỉ nhận được đúng dữ liệu của `t_b` mà không có bất kỳ nguy cơ rò rỉ chéo nào từ giao dịch trước. Cơ chế này cũng hoàn toàn tương thích 100% với chế độ `transaction pooling` của bộ điều phối kết nối *PgBouncer*.

---

### **2.5.3. Cơ chế Bộ nhớ Đệm Hai Tầng Nhận thức Thuê bao (*Two-Tier Tenant-Aware Caching* & Thuật toán *W-TinyLFU*)**

Trong một nền tảng SaaS Kanban, tần suất đọc dữ liệu (như kiểm tra cấu hình quyền hạn của thuê bao, trạng thái cờ tính năng, danh sách thành viên trong bảng và cấu trúc cột Kanban) thường lớn gấp hàng chục lần tần suất ghi. Nếu mọi yêu cầu đều phải mở giao dịch xuống tận PostgreSQL (Tầng 5–6), cơ sở dữ liệu sẽ nhanh chóng trở thành cổ chai hiệu năng. Tuy nhiên, việc thiết kế bộ nhớ đệm (*Caching*) trong môi trường đa thuê bao phức tạp hơn nhiều so với hệ thống đơn thuê bao vì phải giải quyết đồng thời hai bài toán: **(1) Chống rò rỉ dữ liệu qua bộ nhớ đệm (*Cache Isolation*)** và **(2) Chống hiện tượng một thuê bao lớn quét sạch bộ nhớ đệm của các thuê bao nhỏ (*Cache Thrashing / Noisy Neighbor in Cache*)**.

#### **2.5.3.1. Kiến trúc Phối hợp Bộ nhớ Đệm Hai Tầng (L1 In-Memory Cache + L2 Distributed Cache)**
Để tối ưu hóa cả độ trễ truy xuất (*Latency*) lẫn tính nhất quán toàn cục (*Consistency*) trên cụm nhiều thực thể ứng dụng (Tầng 8), hệ thống triển khai kiến trúc **Bộ nhớ đệm Hai tầng (*Two-Tier Caching*)**:
* **Bộ nhớ đệm Tầng 1 – *L1 Local In-Process Cache* (Tại Tầng 8 – Ví dụ: *Caffeine Cache*):** Nằm ngay trên vùng nhớ *Heap* của từng tiến trình ứng dụng. Thời gian truy xuất đạt mức nano-giây đến micro-giây ($\ll 0,1\text{ ms}$) vì không tốn chi phí tuần tự hóa dữ liệu (*Serialization*) hay độ trễ truyền mạng. L1 lưu trữ một tập nhỏ các dữ liệu siêu nóng (*Hot Metadata*: cấu hình thuê bao, quy tắc *Feature Flags*) với thời gian sống ngắn (*Short TTL*).
* **Bộ nhớ đệm Tầng 2 – *L2 Distributed Cache* (Tại Tầng 7 – Ví dụ: *Redis Cluster*):** Đóng vai trò là nguồn chân lý bộ nhớ đệm dùng chung cho toàn bộ các Pod ứng dụng, với độ trễ truy xuất khoảng $0,5 - 2\text{ ms}$ qua mạng nội bộ. Khi dữ liệu của một thuê bao thay đổi, tiến trình cập nhật sẽ xóa/cập nhật khóa trên L2 Redis đồng thời phát một thông điệp qua kênh *Redis Pub/Sub Invalidation Channel* để tất cả các Pod ứng dụng khác lập tức xóa bản ghi tương ứng trên L1 Cache của mình.

#### **2.5.3.2. Quy chuẩn Đóng gói Không gian Khóa (*Tenant-Prefixed Key Namespacing*)**
Trên cả L1 và L2 Cache, hệ thống nghiêm cấm tuyệt đối việc đặt tên khóa chỉ dựa trên định danh thực thể đơn lẻ (như `board:1024` hay `config:limits`). Mọi thao tác đọc/ghi bộ nhớ đệm đều phải đi qua một lớp bọc bắt buộc (*Tenant-Aware Cache Manager*) tự động trích xuất `tenant_id` từ `TenantContext` hiện hành để ghép vào đầu khóa theo cấu trúc chuẩn:
$$\text{CacheKey} = \texttt{tenant:\{}\text{tenant\_id}\texttt{\}:\{}\text{domain\_entity}\texttt{\}:\{}\text{entity\_id}\texttt{\}}$$
Ví dụ: `tenant:t_alpha:board:1024` và `tenant:t_beta:flags:ruleset`. Quy chuẩn này đảm bảo rằng ngay cả khi hai thuê bao tình cờ có các đối tượng trùng khóa cục bộ hoặc một lập trình viên gọi hàm `cache.get("board:1024")`, hệ thống vẫn tự động khóa phạm vi tìm kiếm vào đúng không gian tên của thuê bao đang thực thi.

#### **2.5.3.3. Chống *Noisy Neighbor* trên Bộ nhớ Đệm bằng Thuật toán Thu hồi *W-TinyLFU***
Một lỗ hổng kinh điển của các bộ nhớ đệm dùng thuật toán thu hồi **LRU (*Least Recently Used*)** truyền thống trong môi trường đa thuê bao là hiện tượng **Ô nhiễm quét bộ nhớ đệm (*Scan Pollution / Cache Thrashing*)**: Giả sử *Tenant A*, *Tenant B* và *Tenant C* đang làm việc bình thường và các cấu hình bảng Kanban hay dùng nhất của họ đang nằm ổn định trong L1 Cache. Đột nhiên, một thuê bao khác (*Tenant D*) chạy một tác vụ xuất báo cáo hàng loạt (*Batch Export*) quét qua 50.000 thẻ công việc cũ chỉ đọc đúng một lần (*One-hit wonders*). Nếu dùng thuật toán LRU đơn thuần, 50.000 bản ghi mới truy cập một lần của *Tenant D* sẽ lần lượt đẩy toàn bộ dữ liệu có tần suất sử dụng cao của *Tenant A, B, C* ra khỏi bộ nhớ đệm, khiến tỷ lệ trúng đích (*Cache Hit Ratio*) của toàn hệ thống tụt dốc thảm hại!

Để hóa giải triệt để bài toán *Noisy Neighbor* này, tầng L1 Cache (*Caffeine*) sử dụng thuật toán **W-TinyLFU (*Window Tiny Least Frequently Used*)** (Einziger et al., 2017):

![Hình 2.15: Kiến trúc Bộ nhớ đệm Hai tầng (L1 Caffeine + L2 Redis) và cơ chế lọc tần suất W-TinyLFU chống hiệu ứng Noisy Neighbor](../diagrams/diagrams_C2/png/hinh_2_15_two_tier_caching.drawio.png)

*Hình 2.15: Kiến trúc Bộ nhớ đệm Hai tầng (L1 Caffeine + L2 Redis) và cơ chế lọc tần suất W-TinyLFU chống hiệu ứng Noisy Neighbor. (Bản vẽ chuẩn hóa XML: [hinh_2_15_two_tier_caching.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_15_two_tier_caching.drawio))*

Như minh họa chi tiết trên **Hình 2.15**, khi luồng yêu cầu tra cứu khóa `tenant:{id}:flags`:
1. Nếu **Trúng L1 (*L1 Hit*)**, dữ liệu được trả về tức thì từ RAM cục bộ ($\sim 0,05\text{ ms}$).
2. Nếu **Trượt L1 (*L1 Miss*)**, hệ thống tra cứu xuống **Tầng L2 Redis** ($\sim 1-2\text{ ms}$). Nếu tiếp tục trượt L2 (*L2 Miss*), hệ thống mới truy vấn xuống **PostgreSQL DB** (có bảo vệ bởi RLS) và nạp ngược lên L2 Redis.
3. **Điểm đột phá nằm ở Bộ lọc Nhập cảnh *W-TinyLFU Admission Filter* khi nạp dữ liệu vào L1:** Thay vì cho phép mọi dữ liệu mới đọc từ L2/DB đi thẳng vào vùng bộ nhớ chính của L1, *W-TinyLFU* sử dụng cấu trúc phác thảo tần suất **Count-Min Sketch** (chỉ tốn vài byte cho mỗi khóa) để ước lượng tần suất truy cập lịch sử của mục dữ liệu mới ($f_{\text{new}}$) và so sánh với tần suất của mục ứng viên sắp bị trục xuất khỏi vùng chính ($f_{\text{victim}}$):
   * Chỉ khi mục dữ liệu mới chứng minh được tần suất truy cập cao hơn nạn nhân ($f_{\text{new}} > f_{\text{victim}}$), nó mới được **Chấp nhận ghi vào L1 (*Admit to Main Space*)**.
   * Nếu mục dữ liệu mới chỉ là truy cập quét một lần (*One-hit wonder* từ tác vụ xuất báo cáo của một *Noisy Neighbor*, có $f_{\text{new}} \le f_{\text{victim}}$), bộ lọc sẽ **Từ chối ghi đè vào vùng chính L1** (bảo vệ an toàn các khóa nóng của những thuê bao khác đang nằm trong L1), nhưng **vẫn luôn trả dữ liệu đầy đủ về cho Request hiện tại**.

---

### **2.5.4. Cơ chế Quản lý Tùy biến Động bằng Cờ Tính năng (*Dynamic Feature Flags* theo Chuẩn *OpenFeature*)**

Mảnh ghép cuối cùng trong bốn cơ chế kỹ thuật lúc chạy tại Tầng 9 là giải quyết bài toán: **Làm thế nào để một bộ mã nguồn duy nhất (*Single Codebase*) có thể cung cấp các gói tính năng, hạn mức (*Quotas*) và luồng nghiệp vụ hoàn toàn khác nhau cho từng thuê bao mà không cần viết các câu lệnh rẽ nhánh cứng (`if (tenantId == "acme")`) hay phải khởi động lại máy chủ khi khách hàng nâng cấp gói cước?**

Câu trả lời chuẩn mực trong kỹ thuật phần mềm đám mây hiện đại là sử dụng hệ thống **Đánh giá Cờ Tính năng Động theo Ngữ cảnh (*Context-Aware Feature Flag Evaluation*)**, được chuẩn hóa bởi dự án **OpenFeature** thuộc Hiệp hội Điện toán Đám mây Bản địa (*Cloud Native Computing Foundation – CNCF*).

#### **2.5.4.1. Mô hình Toán học của Hàm Đánh giá Cờ Tính năng Đa thuê bao**
Thay vì coi cờ tính năng chỉ là một biến logic (`true/false`) toàn cục dùng để bật/tắt tính năng khi phát hành mã nguồn (*Release Toggle*), trong kiến trúc đa thuê bao, mỗi cờ tính năng là một **hàm ánh xạ đa trị phụ thuộc ngữ cảnh** được định nghĩa hình thức như sau:
$$\text{FlagValue} = f\left(\text{FlagKey},\; \text{EvaluationContext},\; \text{Ruleset}\right)$$
Trong đó:
* $\text{FlagKey} \in \Sigma^*$: Định danh của tính năng hoặc thông số hạn mức cần kiểm tra (ví dụ: `"kanban.wip_limit.enabled"`, `"kanban.board.max_count"`, `"kanban.audit_log.retention_days"`).
* $\text{EvaluationContext} = \langle \text{tenant\_id}, \text{tier}, \text{region}, \text{user\_role}, \text{custom\_attributes} \rangle$: Vector ngữ cảnh đánh giá được trích xuất tự động từ đối tượng `TenantContext` của luồng thực thi hiện tại (đã thiết lập ở Mục 2.5.1).
* $\text{Ruleset}$: Tập hợp các quy tắc phân khúc (*Targeting Rules*) và ghi đè (*Tenant Overwrites*) được lưu trữ dưới dạng siêu dữ liệu JSON/JSONB trong CSDL và được đệm trực tiếp trên kiến trúc *Two-Tier Cache (L1 Caffeine + L2 Redis)* ở Mục 2.5.3.
* $\text{FlagValue} \in \{\text{Boolean}, \text{Integer}, \text{Double}, \text{String}, \text{JSON Object}\}$: Giá trị đầu ra điều khiển trực tiếp hành vi của mã nguồn tại thời điểm chạy.

#### **2.5.4.2. Thứ tự Ưu tiên Phân giải Quy tắc (*Rule Resolution Precedence*) và Vận hành Thời gian thực**
Khi mã nguồn nghiệp vụ gọi giao diện chuẩn của *OpenFeature SDK* (ví dụ: `featureClient.getBooleanValue("kanban.wip_limit.enabled", false, evaluationContext)`), công cụ đánh giá (*Evaluation Engine*) sẽ duyệt qua $\text{Ruleset}$ theo thứ tự ưu tiên từ cụ thể nhất đến tổng quát nhất:
1. **Mức ưu tiên 1 – Ghi đè Cụ thể theo Định danh Thuê bao (*Tenant-Specific Override*):** Kiểm tra xem `tenant_id` hiện tại có nằm trong danh sách được cấp quyền đặc biệt (*Allowlist / Beta Tester*) hay bị khóa tính năng riêng lẻ hay không.
2. **Mức ưu tiên 2 – Phân khúc theo Gói cước Thương mại (*Tier-Based Targeting Rule*):** Đối chiếu thuộc tính `tier` trong ngữ cảnh với bảng chính sách gói cước (ví dụ: nếu `tier == 'ENTERPRISE'` hoặc `tier == 'PRO'` $\rightarrow$ trả về `true` cho tính năng giới hạn WIP và trường tùy chỉnh; nếu `tier == 'FREE'` $\rightarrow$ trả về `false`, giới hạn tối đa 3 bảng Kanban và 50 thẻ/bảng).
3. **Mức ưu tiên 3 – Phát hành Tăng dần theo Tỷ lệ Băm Nhất quán (*Percentage Rollout via Consistent Hashing*):** Khi nhà cung cấp muốn thử nghiệm một tính năng mới (như giao diện kéo thả Kanban mới hoặc trợ lý AI) cho $10\%$ tổng số thuê bao, công cụ sẽ tính giá trị băm chuẩn hóa:
   $$h = \text{Hash}(\text{FlagKey} \oplus \text{tenant\_id}) \bmod 100$$
   Nếu $h < 10$ thì bật tính năng cho toàn bộ người dùng thuộc thuê bao đó. Việc băm theo `tenant_id` (thay vì `user_id` ngẫu nhiên) đảm bảo **tính nhất quán nội bộ tổ chức**: mọi thành viên trong cùng một công ty luôn nhìn thấy cùng một bộ tính năng và giao diện làm việc thống nhất.
4. **Mức ưu tiên 4 – Giá trị Mặc định An toàn (*Default Fallback Value*):** Nếu không khớp quy tắc nào hoặc hệ thống lưu trữ cấu hình gặp sự cố, trả về giá trị mặc định an toàn đã khai báo trong mã nguồn.

Nhờ sự phối hợp chặt chẽ giữa **Mục 2.5.1 (`TenantContext`)**, **Mục 2.5.3 (`Two-Tier Cache`)** và **Mục 2.5.4 (`OpenFeature`)**, khi một khách hàng thực hiện nâng cấp gói cước từ *Free* lên *Pro*, hệ thống quản trị (*Control Plane*) chỉ cần cập nhật siêu dữ liệu và phát tín hiệu xóa khóa cache qua *Redis Pub/Sub*. Ngay ở mili-giây tiếp theo, toàn bộ tính năng cao cấp của thuê bao đó được mở khóa tức thời trên mọi máy chủ ứng dụng mà không cần biên dịch lại mã nguồn hay gián đoạn bất kỳ phiên làm việc nào.

---

## **2.6. Khung Quyết định Lựa chọn Kiến trúc và Định vị Đề tài**

Sau khi đã khảo sát toàn diện 4 mô hình vĩ mô (Mục 2.2), giải phẫu chiến lược Tách – Gộp trên 9 tầng (Mục 2.3), phân tích 3 kịch bản phối hợp thực tế (Mục 2.4) và làm chủ 4 cơ chế vận hành cốt lõi (Mục 2.5), mục cuối cùng của Chương 2 tổng hợp toàn bộ tri thức trên thành một **Khung Quyết định Lựa chọn Kiến trúc Tổng quát (*Architectural Decision Framework*)**, từ đó xác lập và biện luận cấu hình kiến trúc cụ thể cho **Nền tảng SaaS Kanban** sẽ được thiết kế và hiện thực hóa thực nghiệm tại Chương 3 và Chương 4.

### **2.6.1. Năm Tiêu chí Đầu vào Cốt lõi của Bài toán Lựa chọn Kiến trúc**

Khi đứng trước bài toán thiết kế mới hoặc tái cấu trúc một hệ thống SaaS đa thuê bao, người kiến trúc sư cần thu thập và lượng hóa **5 biến số đầu vào cốt lõi** sau đây:
1. **Tiêu chí 1 – Ràng buộc Tuân thủ Pháp lý và Định cư Dữ liệu (*Regulatory Compliance & Data Residency*):** Ngành nghề của khách hàng mục tiêu có bắt buộc cô lập vật lý máy chủ/CSDL theo luật định (như HIPAA, PCI-DSS mức 1, dữ liệu quốc phòng) hay chấp nhận cô lập logic được kiểm toán (như SOC2, GDPR tiêu chuẩn)?
2. **Tiêu chí 2 – Mức độ Tùy biến Cấu trúc Dữ liệu và Nghiệp vụ (*Customization Depth*):** Khách hàng chỉ cần tùy biến giao diện, quy trình và trường mở rộng ở mức siêu dữ liệu (*Metadata / JSONB / Feature Flags*), hay bắt buộc phải can thiệp sâu vào lược đồ vật lý (*Custom Tables, Triggers, Stored Procedures*) và chạy mã nguồn riêng?
3. **Tiêu chí 3 – Quy mô Số lượng Thuê bao ($N$) và Doanh thu Trung bình trên mỗi Thuê bao (*ARPU & TCO Sensitivity*):** Hệ thống hướng tới $N \sim 10^1 - 10^2$ khách hàng tập đoàn lớn (ARPU hàng chục nghìn USD/năm) hay $N \sim 10^3 - 10^5$ khách hàng vừa, nhỏ và miễn phí (ARPU thấp, đòi hỏi chi phí biên $\delta \to 0$)?
4. **Tiêu chí 4 – Đặc trưng Tải Truy cập và Độ nhạy với Hiệu ứng *Noisy Neighbor* (*Workload Profile & SLA Strictness*):** Lưu lượng truy cập của các thuê bao mang tính ổn định hay có sự chênh lệch quy mô cực đoan (ví dụ: thuê bao lớn có 10.000 người dùng hoạt động liên tục cùng tồn tại với thuê bao nhỏ có 5 người dùng)? Cam kết độ trễ thời gian thực (như kéo thả thẻ Kanban $< 100\text{ ms}$) nghiêm ngặt đến mức nào?
5. **Tiêu chí 5 – Năng lực Đội ngũ Vận hành Hệ thống (*DevOps / SRE Maturity*):** Đội ngũ phát triển có đủ nhân lực và công cụ tự động hóa (*Terraform, Kubernetes Operator, Multi-DB Migration Orchestrator*) để quản trị hàng trăm cụm dữ liệu rời rạc hay ưu tiên một kiến trúc hợp nhất gọn nhẹ, dễ bảo trì?

---

### **2.6.2. Lưu đồ Cây Quyết định Kiến trúc Tổng quát (*Architectural Decision Tree*)**

Từ 5 tiêu chí đầu vào trên, **Hình 2.16** mô hình hóa quy trình ra quyết định lựa chọn kiến trúc đa thuê bao thông qua một **Cây Quyết định 4 Nút Kiểm tra Tuần tự (*4-Stage Sequential Decision Tree*)** dẫn tới 4 cấu hình kiến trúc đích.

![Hình 2.16: Lưu đồ Cây Quyết định (Decision Tree) lựa chọn mô hình kiến trúc Đa thuê bao theo 4 nút điều kiện cốt lõi](../diagrams/diagrams_C2/png/hinh_2_16_decision_tree.drawio.png)

*Hình 2.16: Lưu đồ Cây Quyết định (Decision Tree) lựa chọn mô hình kiến trúc Đa thuê bao theo 4 nút điều kiện cốt lõi. (Bản vẽ chuẩn hóa XML: [hinh_2_16_decision_tree.drawio](../diagrams/diagrams_C2/drawio_updated/hinh_2_16_decision_tree.drawio))*

Quy trình suy diễn trên **Hình 2.16** diễn ra qua 4 bước kiểm tra chặt chẽ như sau:
* **Bước 1 (Nút quyết định 1 – Kiểm tra Ràng buộc Pháp lý Cứng):** Đặt câu hỏi *"Khách hàng có yêu cầu pháp lý bắt buộc phải tách riêng máy chủ hoặc cơ sở dữ liệu vật lý hay không?"*.
  + Nếu **CÓ** $\rightarrow$ Rẽ nhánh sang **Cấu hình Đích 1: Mô hình *Silo* (Dedicated Infrastructure / Database-per-Tenant)** (tương ứng Kịch bản 2 ở Mục 2.4.2), trong đó tách riêng từ Tầng 1–6 (hoặc Tầng 1–8) và điều phối qua *Control Plane* tự động hóa bằng *Terraform / IaC*.
  + Nếu **KHÔNG** $\rightarrow$ Chuyển xuống Bước 2.
* **Bước 2 (Nút quyết định 2 – Kiểm tra Nhu cầu Tùy biến Sâu Cấu trúc Bảng / Tác vụ Cô lập):** Đặt câu hỏi *"Thuê bao có bắt buộc phải tùy biến sâu cấu trúc bảng vật lý, định nghĩa Trigger riêng hoặc sao lưu/khôi phục lược đồ độc lập hay không?"*.
  + Nếu **CÓ** $\rightarrow$ Rẽ nhánh sang **Cấu hình Đích 2: Mô hình *Bridge* (Schema-per-Tenant trên Shared Compute & Shared DBMS)** (tương ứng Mục 2.2.3 và 2.3.3.4), sử dụng cơ chế chuyển mạch không gian tên `SET LOCAL search_path` (và có thể kết hợp container cát hộp nếu cần chạy tác vụ tùy biến riêng).
  + Nếu **KHÔNG** (nhu cầu tùy biến có thể giải quyết hoàn toàn bằng siêu dữ liệu `JSONB` và *Feature Flags*) $\rightarrow$ Chuyển xuống Bước 3.
* **Bước 3 (Nút quyết định 3 – Kiểm tra Sự Phân hóa Phân khúc Khách hàng & Chênh lệch Quy mô Tải):** Đặt câu hỏi *"Nền tảng có phục vụ đồng thời nhiều phân khúc khách hàng với mức chênh lệch tải cực lớn (ví dụ: gói Enterprise VIP yêu cầu cam kết SLA riêng bên cạnh hàng chục nghìn gói Free/Pro) hay không?"*.
  + Nếu **CÓ** $\rightarrow$ Rẽ nhánh sang **Cấu hình Đích 3: Mô hình *Hybrid / Tiered & Cell-Based Architecture*** (tương ứng Kịch bản 3 ở Mục 2.4.3), trong đó sử dụng *Tier-Aware Router* tại Tầng 7 để đưa nhóm *Free/Pro* vào các *Shared Pool Cells* và đưa nhóm *Enterprise VIP* vào *Dedicated Silo / Dedicated Schema*.
  + Nếu **KHÔNG** $\rightarrow$ Chuyển xuống Bước 4.
* **Bước 4 (Nút quyết định 4 – Tối ưu hóa TCO và Mở rộng Quy mô Lớn):** Khi mục tiêu trọng tâm là tối ưu hóa chi phí vận hành (TCO), hỗ trợ số lượng lớn thuê bao đăng ký tức thời và quản trị lược đồ gọn nhẹ $\rightarrow$ Hội tụ về **Cấu hình Đích 4: Mô hình *Full-Stack Pool* Tăng cường Phòng thủ Chiều sâu (*Defense-in-Depth Shared-Table + RLS + Two-Tier Cache + OpenFeature*)** (tương ứng Kịch bản 1 ở Mục 2.4.1 và các cơ chế ở Mục 2.5).

---

### **2.6.3. Định vị Kiến trúc cho Nền tảng SaaS Kanban của Đề tài**

Áp dụng trực tiếp **Cây Quyết định Kiến trúc (Hình 2.16)** vào bài toán nghiên cứu và xây dựng **Nền tảng Quản lý Công việc Đa thuê bao theo phương pháp Kanban (Multi-Tenant SaaS Kanban Platform)** của đề tài, nhóm nghiên cứu xác lập cấu hình kiến trúc mục tiêu dựa trên các đặc trưng miền bài toán sau:

1. **Đặc thù Nghiệp vụ của Nền tảng SaaS Kanban:**
   * Nền tảng hướng tới phục vụ đồng thời nhiều tổ chức, doanh nghiệp vừa và nhỏ (SMB), các nhóm phát triển phần mềm và một số khách hàng doanh nghiệp theo mô hình phân bậc gói cước (*Free $\rightarrow$ Pro $\rightarrow$ Enterprise*).
   * Dữ liệu cốt lõi của hệ thống Kanban (gồm `tenants`, `users`, `workspaces`, `boards`, `columns/lists`, `cards/tasks`, `comments`, `activity_logs`) có cấu trúc quan hệ rất chuẩn mực và đồng nhất giữa các tổ chức. Nhu cầu tùy biến của các thuê bao (như bật/tắt giới hạn công việc đang làm *WIP Limit*, giới hạn số lượng bảng tối đa, định nghĩa nhãn màu sắc hay các trường thuộc tính mở rộng trên thẻ công việc) hoàn toàn có thể biểu diễn thanh thoát qua cấu trúc siêu dữ liệu (`JSONB`) và hệ thống cờ tính năng (*Feature Flags*) mà không cần phải tạo bảng vật lý riêng cho từng thuê bao.
   * Thao tác kéo thả thẻ công việc (*Drag-and-Drop Card Positioning*) và đồng bộ bảng thời gian thực đòi hỏi **độ trễ phản hồi rất thấp** và **tính toàn vẹn giao dịch cao**, đồng thời phải tuyệt đối không để xảy ra rò rỉ dữ liệu thẻ công việc giữa các công ty cạnh tranh.

2. **Quyết định Định vị Kiến trúc của Đề tài:**
   Từ các phân tích trên, đề tài quyết định lựa chọn **Mô hình *Pool* Hợp nhất Toàn ngăn xếp làm Hạt nhân Trọng tâm (*Core Full-Stack Pool Architecture*), được gia cố bằng hệ thống Phòng thủ Chiều sâu 4 lớp (Mục 2.5) và thiết kế sẵn sàng mở rộng theo hướng Phân tầng (*Tier-Ready Hybrid*)**:
   * **Tại Tầng 8 & Tầng 9:** Xây dựng trên một bộ mã nguồn duy nhất (*Single Codebase*) và cụm tiến trình thực thi không trạng thái (*Stateless Application Runtime*); quản lý ngữ cảnh bằng `TenantContext` cô lập theo luồng và điều khiển hành vi đa gói cước (*Free / Pro / Enterprise*) bằng công cụ đánh giá **OpenFeature** (như minh họa tại **Hình 2.9b**).
   * **Tại Tầng 7:** Triển khai tầng *Middleware* nhận thức thuê bao gồm bộ lọc xác thực JWT tại biên, kiểm soát lưu lượng theo thuê bao (*Per-Tenant Rate Limiting*) và hệ thống **Bộ nhớ đệm Hai tầng (*L1 Caffeine với W-TinyLFU + L2 Redis Cluster*)** có tiền tố khóa `tenant:{id}:*`.
   * **Tại Tầng 5 & Tầng 6:** Áp dụng kiến trúc **Bảng dùng chung (*Shared-Table*) trên PostgreSQL** kết hợp bắt buộc với cơ chế **Bảo mật Cấp độ Dòng (*Row-Level Security – RLS* với `ENABLE` + `FORCE` + `USING` + `WITH CHECK`)** và cơ chế truyền ngữ cảnh giao dịch nguyên tử **`BEGIN; SET LOCAL app.current_tenant_id = ...; COMMIT;`** qua bể kết nối dùng chung.
   * **Tại Tầng 4:** Quản lý tệp đính kèm thẻ công việc trên *Shared Object Storage Bucket* phân vùng theo tiền tố `tenants/{tenant_id}/` và cấp phát *Pre-signed URL* ngắn hạn.

**Bảng 2.8** tổng hợp tường minh quyết định thiết kế trên cả 9 tầng của nền tảng SaaS Kanban thuộc đề tài.

*Bảng 2.8: Cấu hình định vị kiến trúc 9 tầng của Nền tảng SaaS Kanban trong đề tài nghiên cứu.*

| Tầng | Tên Tầng Ngăn xếp | Quyết định Tách / Gộp của Đề tài | Cơ chế Kỹ thuật & Công nghệ Hiện thực hóa trong Hệ thống SaaS Kanban |
| :-: | :--- | :-: | :--- |
| **9** | **App Code & Config** | **Gộp (*Single Codebase*)** | Một bộ mã nguồn chuẩn; phân biệt gói *Free/Pro/Enterprise* (giới hạn số Board, WIP Limit, Custom Fields) qua **OpenFeature** & cột siêu dữ liệu `JSONB`. |
| **8** | **Application Runtime** | **Gộp (*Stateless Pool*)** | Cụm tiến trình Backend không trạng thái; cô lập ngữ cảnh bằng `TenantContext` gắn theo luồng và tự động dọn dẹp trong khối `finally`. |
| **7** | **Middleware** | **Gộp (*Tenant-Aware*)** | Xác thực JWT chứa `{tenant_id, tier}`; bộ nhớ đệm 2 tầng **L1 Caffeine (*W-TinyLFU*) + L2 Redis** với khóa `tenant:{id}:*`; *Rate Limiting* theo thuê bao. |
| **6** | **Database (Logical)** | **Gộp (*Shared-Table + RLS*)** | Bảng dữ liệu dùng chung (`boards`, `lists`, `cards`...) có cột `tenant_id` dẫn đầu chỉ mục tổ hợp; kích hoạt cứng **PostgreSQL RLS (`ENABLE` + `FORCE`)**. |
| **5** | **DBMS** | **Gộp (*Shared DBMS*)** | Cụm máy chủ **PostgreSQL** dùng chung; quản lý kết nối qua *Connection Pool* kết hợp thiết lập biến giao dịch nguyên tử **`SET LOCAL app.current_tenant_id`**. |
| **4** | **Cloud Storage** | **Gộp (*Prefix Partitioned*)** | Lưu trữ tệp đính kèm thẻ Kanban trên *Shared Bucket (S3/MinIO)* theo đường dẫn `tenants/{tenant_id}/boards/{board_id}/...` và cấp phát *Pre-signed URL*. |
| **3** | **Virtualization & Container** | **Gộp (*Containerized*)** | Đóng gói đồng nhất bằng **Docker Containers** với giới hạn tài nguyên (`CPU/Memory Limits`) rõ ràng. |
| **2** | **Network Infrastructure** | **Gộp (*Shared Network*)** | Mạng nội bộ container cô lập cổng giao tiếp, chỉ mở cổng HTTP/WebSocket qua tầng cổng biên. |
| **1** | **Physical Hardware** | **Gộp (*Shared Host*)** | Vận hành trên hạ tầng máy chủ chia sẻ tài nguyên tiêu chuẩn. |

> **Bàn luận về ý nghĩa khoa học của việc chọn cấu hình *Full-Stack Pool + Defense-in-Depth* cho thực nghiệm:** Nếu đề tài chỉ chọn mô hình *Silo* (tách rời từng máy chủ cho từng khách hàng), bài toán kỹ thuật phần mềm sẽ trở nên tầm thường vì sự cô lập đã do phần cứng/ảo hóa gánh vác sẵn. Ngược lại, việc lựa chọn mô hình **Full-Stack Pool ở mức độ chia sẻ sâu nhất (dùng chung từ tiến trình ứng dụng, bộ nhớ đệm cho tới bảng dữ liệu)** chính là phép thử khắc nghiệt nhất và có giá trị khoa học cao nhất: nó cho phép Chương 3 và Chương 4 kiểm chứng thực nghiệm xem các cơ chế phần mềm hiện đại (*RLS + `SET LOCAL` + Two-Tier W-TinyLFU Cache + OpenFeature*) có thực sự bảo vệ được 100% tính cô lập dữ liệu và kiểm soát được độ trễ hiệu năng dưới tải đa thuê bao hay không.

---

### **2.6.4. Tổng kết Chương 2 và Bảng Đối soát Chuyển giao sang Chương 3**

Như vậy, Chương 2 đã hoàn thành trọn vẹn sứ mệnh chuyển hóa bộ khung lý thuyết của Chương 1 thành một bản thiết kế kiến trúc đa thuê bao toàn diện, có tính hệ thống và khả năng áp dụng thực tiễn cao. Khép lại chương này, **Bảng 2.9** thiết lập ma trận đối soát chuyển giao trực tiếp từ 7 thách thức cốt lõi của Chương 1, đi qua các giải pháp kiến trúc của Chương 2 để dẫn thẳng sang các mô-đun thiết kế chi tiết và hiện thực hóa mã nguồn tại Chương 3.

*Bảng 2.9: Ma trận đối soát chuyển giao kiến trúc từ Chương 1 $\rightarrow$ Chương 2 $\rightarrow$ Chương 3.*

| Mã | Thách thức Cốt lõi từ Chương 1 *(Mục 1.6)* | Giải pháp Kiến trúc & Cơ chế Đã Xác lập tại Chương 2 | Hạng mục Thiết kế Chi tiết & Hiện thực hóa tại Chương 3 |
| :-: | :--- | :--- | :--- |
| **C1** | **Bảo mật và Cô lập dữ liệu** *(Ngăn chặn rò rỉ dữ liệu chéo)* | • Mô hình *Shared-Table* kết hợp **PostgreSQL RLS (`ENABLE` + `FORCE` + `USING` + `WITH CHECK`)** (Mục 2.3.3.3, Hình 2.7).<br/>• Cơ chế giao dịch nguyên tử **`SET LOCAL app.current_tenant_id`** trên *Connection Pool* (Mục 2.5.2, Hình 2.14).<br/>• Phân vùng tiền tố Object Storage & *Pre-signed URL* (Mục 2.3.2.3). | Thiết kế Lược đồ CSDL vật lý của hệ thống Kanban, viết kịch bản DDL khởi tạo bảng + chính sách RLS, và cài đặt *Database Transaction Interceptor* tự động tiêm lệnh `SET LOCAL`. |
| **C2** | **Cô lập hiệu năng & Chống *Noisy Neighbor*** | • Kiến trúc **Bộ nhớ đệm Hai tầng (L1 Caffeine + L2 Redis)** với bộ lọc tần suất **W-TinyLFU** chống quét cache (Mục 2.5.3, Hình 2.15).<br/>• *Per-Tenant Rate Limiting* tại Tầng 7 (Mục 2.3.4.3) và kiến trúc khoanh vùng *Cell-Based* (Mục 2.4.3, Hình 2.12). | Cài đặt mô-đun *Tenant-Aware Cache Manager* (tự động ghép tiền tố `tenant:{id}:*`), cấu hình thuật toán *W-TinyLFU* và bộ lọc giới hạn tốc độ yêu cầu theo gói cước. |
| **C3** | **Độ phức tạp Quản lý Cấu hình & Tùy biến Động** | • Duy trì bất biến **Single Codebase** tại Tầng 9 (Mục 2.3.5.3, Hình 2.9b).<br/>• Cơ chế đánh giá **Cờ tính năng động theo chuẩn OpenFeature** $\text{FlagValue} = f(\text{FlagKey}, \text{TenantContext}, \text{Ruleset})$ (Mục 2.5.4, Hình 2.13). | Thiết kế cấu trúc siêu dữ liệu gói cước (*Free/Pro/Enterprise*), cài đặt *OpenFeature Provider* kết nối với bộ nhớ đệm 2 tầng để kiểm soát giới hạn bảng và *WIP Limit* lúc chạy. |
| **C4** | **Vận hành Vòng đời & Nâng cấp Không gián đoạn** | • Chiến lược *Shared-Table* giúp giảm độ phức tạp *Schema Migration* từ $O(N)$ về **$O(1)$ thao tác duy nhất** (Mục 2.3.3.5, Bảng 2.2).<br/>• Khởi tạo thuê bao mới (*Self-Service Onboarding*) tức thì bằng bản ghi siêu dữ liệu. | Hiện thực hóa luồng đăng ký không gian làm việc (*Tenant Onboarding API*) và quy trình di trú lược đồ CSDL thống nhất bằng công cụ quản lý phiên bản DB. |
| **C5** | **Khả năng Quan sát & Định lượng theo Thuê bao** | • Lan truyền xuyên suốt đối tượng **`TenantContext`** qua cả luồng đồng bộ và bất đồng bộ (Mục 2.5.1, Hình 2.9b, Hình 2.13).<br/>• Đính kèm nhãn `tenant_id` và `tier` vào mọi bản ghi Log, Metric và Trace tại Tầng 7–8. | Cài đặt *Auth & Context Filter*, tích hợp bộ ghi nhận chỉ số vận hành (*Structured Logging & Metrics*) gắn nhãn `tenant_id` để phục vụ đo kiểm tại Chương 4. |
| **C6** | **Tuân thủ Pháp lý & Định cư Dữ liệu** | • Khung Cây quyết định 4 nút (Mục 2.6.2, Hình 2.16) cho phép định tuyến linh hoạt sang mô hình *Bridge (Schema-per-Tenant)* hoặc *Silo* khi khách hàng có yêu cầu pháp lý đặc thù. | Thiết kế lớp trừu tượng hóa truy cập dữ liệu và nhật ký kiểm toán (*Tenant Audit Log*) đảm bảo khả năng truy vết mọi thao tác thay đổi dữ liệu trong không gian thuê bao. |
| **C7** | **Độ phức tạp Thiết kế & Kiểm thử Phần mềm** | • Hệ quy ước kiến trúc chuẩn hóa (Mục 2.1.2) và mẫu thiết kế *Fail-Closed* (khi thiếu ngữ cảnh tự động trả về 0 dòng dữ liệu). | Xây dựng bộ kịch bản kiểm thử tự động (*Automated Security & Isolation Test Suite*) kiểm chứng khả năng chặn truy cập chéo giữa *Tenant A* và *Tenant B*. |

---

## **TÀI LIỆU THAM KHẢO CHƯƠNG 2**

1. **Amazon Web Services (AWS).** (2024). *AWS Well-Architected Framework: SaaS Lens – General Design Principles & Tenant Isolation Models (Silo, Pool, Bridge, and Cell-Based Architectures)*. AWS Whitepapers & Guides.
2. **Aulbach, S., Grust, T., Jacobs, D., Kemper, A., & Rittinger, J.** (2008). Multi-tenant databases for software as a service: Schema-mapping techniques. In *Proceedings of the 2008 ACM SIGMOD International Conference on Management of Data* (pp. 1195–1206). ACM. https://doi.org/10.1145/1376616.1376736
3. **Bezemer, C.-P., & Zaidman, A.** (2010). Multi-tenant SaaS applications: Maintenance dream or nightmare? In *Proceedings of the Joint ERCIM Workshop on Software Evolution (EVOL) and International Workshop on Principles of Software Evolution (IWPSE)* (pp. 88–92). ACM. https://doi.org/10.1145/1862372.1862393
4. **Bradshaw, S., Brazil, E., & Chodorow, K.** (2019). *MongoDB: The Definitive Guide – Powerful and Scalable Data Storage* (3rd ed.). O'Reilly Media.
5. **Chong, F., & Carraro, G.** (2006). *Architecture strategies for catching the long tail*. Microsoft Corporation, MSDN Library.
6. **Chong, F., Carraro, G., & Wolter, R.** (2006). *Multi-tenant data architecture*. Microsoft Corporation, MSDN Library.
7. **Cloud Native Computing Foundation (CNCF).** (2024). *OpenFeature Specification (v0.8.0): Vendor-agnostic, community-driven API for feature flagging*. https://openfeature.dev/specification/
8. **Einziger, G., Friedman, R., & Manes, B.** (2017). TinyLFU: A highly efficient cache admission policy. *ACM Transactions on Storage (TOS)*, 13(4), Article 35, 1–31. https://doi.org/10.1145/3149371
9. **Kabbedijk, J., Bezemer, C.-P., Jansen, S., & Zaidman, A.** (2015). Defining multi-tenancy: A systematic mapping study on the academic and the industrial perspective. *Journal of Systems and Software*, 100, 139–148. https://doi.org/10.1016/j.jss.2014.10.034
10. **Kleppmann, M.** (2017). *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. O'Reilly Media.
11. **Microsoft Azure Architecture Center.** (2024). *Architecting multitenant solutions on Azure: Tenancy models, data isolation approaches, and noisy neighbor mitigation*. Microsoft Learn Documentation.
12. **PostgreSQL Global Development Group.** (2024). *PostgreSQL 16 Documentation – Section 5.8: Row Security Policies & Section 20.1: Setting Parameters (`SET LOCAL`)*. https://www.postgresql.org/docs/current/ddl-rowsecurity.html
