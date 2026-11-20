# Báo cáo: Thuê bao, dịch vụ, instance, ảo hóa và các đặc tính multi-user, multi-instance, multi-tenant

**Phạm vi:** Điện toán đám mây và hệ thống đa thuê bao.  
**Mục đích:** Thống nhất thuật ngữ dùng trong kiến trúc và báo cáo nghiên cứu khoa học.  
**Ngày lập:** 24/10/2026.

## 1. Nguyên tắc sử dụng

Trong báo cáo này, “thuê bao” tương ứng với tenant trong hệ thống đám mây đa thuê bao. Các định nghĩa tiếng Việt là phần diễn giải, tổng hợp và đề xuất trên cơ sở tài liệu khoa học, không phải trích nguyên văn từ các bài báo. Các ví dụ do báo cáo xây dựng để minh họa, không phải kết quả thực nghiệm được công bố trong nguồn tham khảo.

Các định nghĩa được giữ ở mức khái quát. Những lựa chọn như mỗi tenant có instance riêng hoặc mỗi instance chạy trong một container phải được trình bày thành quy ước kiến trúc của nghiên cứu.

## 2. Thuê bao — Tenant

### Định nghĩa đề xuất

**Thuê bao là một thực thể sử dụng hệ thống, đại diện cho một cá nhân, nhóm người dùng hoặc tổ chức, được hệ thống quản lý trong một phạm vi logic riêng về dữ liệu, cấu hình và quyền truy cập, đồng thời có thể chia sẻ tài nguyên với các thuê bao khác.**

### Căn cứ khoa học

Kabbedijk và cộng sự [1], tại mục 5, xem tenant là khách hàng cùng chia sẻ tài nguyên hệ thống một cách trong suốt, nhưng vẫn có khả năng cấu hình hệ thống theo nhu cầu riêng. Tài nguyên chia sẻ có thể thuộc nhiều tầng: dịch vụ, ứng dụng, cơ sở dữ liệu hoặc phần cứng. [Trang công bố và bản thảo toàn văn](https://research.tudelft.nl/en/publications/defining-multi-tenancy-a-systematic-mapping-study-on-the-academic/).

Sandholm và Lee [2], tại mục “Multi-tenancy”, xem tenant là bên sử dụng hạ tầng đám mây, lấy chủ sở hữu máy ảo làm ví dụ và nhấn mạnh yêu cầu cách ly giữa các tenant. [Bài báo toàn văn](https://link.springer.com/article/10.1186/s13677-014-0021-5).

Định nghĩa đề xuất kết hợp vai trò bên sử dụng hệ thống với phạm vi quản lý và cách ly logic. Phần dữ liệu, cấu hình và quyền truy cập là cách tổng hợp để sử dụng trong mô hình nghiên cứu, không phải câu định nghĩa nguyên văn của hai nguồn.

### Ví dụ minh họa

Một nền tảng quản lý trường học phục vụ Trường A và Trường B. Mỗi trường là một tenant; giáo viên và học sinh là người dùng thuộc tenant tương ứng. Hai trường có thể dùng chung phần mềm và máy chủ, trong khi dữ liệu, cấu hình và quyền truy cập được kiểm soát theo từng trường.

Một tenant có thể có nhiều người dùng. Việc bổ sung tài khoản giáo viên cho Trường A không nhất thiết tạo thêm tenant.

## 3. Dịch vụ — Service

### Định nghĩa đề xuất

**Dịch vụ là một đơn vị chức năng được xác định rõ, cung cấp một hoặc nhiều khả năng cho bên sử dụng thông qua giao diện hoặc hợp đồng tương tác xác định, đồng thời che giấu các chi tiết triển khai bên trong.**

### Căn cứ khoa học

Papazoglou và van den Heuvel [3], tại mục 1, mô tả dịch vụ trong kiến trúc hướng dịch vụ (SOA) là các mô-đun có chức năng xác định và giao diện được công bố. Tác giả phân biệt giao diện dịch vụ với phần hiện thực chức năng phía sau; bên sử dụng tương tác qua giao diện. [Bài báo toàn văn, trang 389–391](https://link.springer.com/content/pdf/10.1007/s00778-007-0044-3.pdf).

Từ cơ sở này, báo cáo dùng “dịch vụ” để chỉ chức năng được cung cấp. Các hiện thân triển khai cụ thể của chức năng đó được mô tả bằng service instance. Nguồn [3] cung cấp cơ sở trong phạm vi SOA; việc vận dụng thành định nghĩa cho hệ thống của nhóm là lựa chọn khái niệm cần công bố trong nghiên cứu.

### Ví dụ minh họa

Trong nền tảng trường học:

- Dịch vụ xác thực kiểm tra danh tính và cung cấp thông tin truy cập.
- Dịch vụ quản lý điểm cung cấp chức năng nhập, sửa và tra cứu điểm.
- Dịch vụ thông báo gửi thông báo đến người dùng.

Dịch vụ quản lý điểm vẫn là cùng một dịch vụ về mặt chức năng dù được triển khai trên một hoặc nhiều máy chủ.

“Dịch vụ” không mặc nhiên đồng nghĩa với “microservice”. Việc tổ chức hệ thống theo kiến trúc microservice là một quyết định kiến trúc bổ sung.

## 4. Instance — Thể hiện triển khai của dịch vụ

### Phạm vi thuật ngữ

“Instance” cần đi kèm đối tượng được thể hiện, chẳng hạn service instance, application instance hoặc VM instance. Trong bộ thuật ngữ đề xuất này, **instance đứng riêng được quy ước là service instance**, trừ khi có chú thích khác.

### Định nghĩa đề xuất

**Instance của dịch vụ là một hiện thân triển khai cụ thể của phần mềm hiện thực dịch vụ, có định danh và vòng đời riêng, được khởi tạo để thực thi chức năng của dịch vụ trên một môi trường tính toán xác định.**

Vòng đời riêng có nghĩa hệ thống có thể phân biệt và quản lý việc khởi tạo, chạy, dừng hoặc hủy instance đó. Đây là quy ước mô hình hóa được tổng hợp cho báo cáo.

### Căn cứ khoa học

Dragoni và cộng sự [4], tại phần “Scalability”, trình bày ví dụ một dịch vụ được nhân thành ba instance khi tải tăng. Những instance cùng hiện thực dịch vụ và nhận yêu cầu thông qua bộ cân bằng tải. Cách sử dụng này hỗ trợ việc phân biệt một dịch vụ với nhiều instance của dịch vụ đó. [Bản tác giả trên arXiv, trang 2–3](https://arxiv.org/pdf/1702.07149).

Nguồn [4] minh họa thuật ngữ trong kiến trúc microservice; định nghĩa phía trên là phần tổng hợp, không phải câu định nghĩa nguyên văn từ nguồn.

### Ví dụ minh họa

| Đối tượng | Ý nghĩa |
|---|---|
| Dịch vụ quản lý điểm | Chức năng nhập, sửa và tra cứu điểm |
| Instance `grade-01` | Một bản triển khai cụ thể thực hiện chức năng đó |
| Instance `grade-02` | Bản triển khai thứ hai của cùng dịch vụ |
| Instance `grade-03` | Bản triển khai thứ ba của cùng dịch vụ |

Trong ví dụ, hệ thống có một dịch vụ quản lý điểm và ba instance. Khi tăng số instance từ ba lên năm, số dịch vụ về mặt chức năng vẫn là một.

Nếu nhóm triển khai mỗi instance trong một container thì quan hệ một–một này là quy ước triển khai, không phải điều kiện định nghĩa instance.

## 5. Ảo hóa — Virtualization

### Định nghĩa đề xuất

**Ảo hóa là kỹ thuật tạo ra một lớp trừu tượng đối với tài nguyên hoặc môi trường thực thi, cho phép cung cấp và quản lý các tài nguyên hoặc môi trường logic trên hạ tầng nền.**

Đây là định nghĩa tổng hợp ở mức khái quát. Khi mô tả hệ thống, cần chỉ rõ loại ảo hóa đang xét: ảo hóa máy, ảo hóa ở mức hệ điều hành, ảo hóa mạng hoặc lưu trữ.

### Căn cứ khoa học

Popek và Goldberg [5] đặt nền tảng kinh điển cho ảo hóa máy, mô tả máy ảo là một bản sao hiệu quả và được cách ly của máy thực. Nguồn này phù hợp để giải thích ảo hóa máy và VM; không nên dùng riêng nó để khẳng định mọi đặc điểm của tất cả các loại ảo hóa. [Bài báo gốc, trang 412–413](https://www.cs.cornell.edu/courses/cs6411/2018sp/papers/popek-goldberg.pdf).

Felter và cộng sự [6] nghiên cứu hai cách tổ chức môi trường thực thi là máy ảo và Linux container, gắn với khả năng cách ly khối lượng công việc và kiểm soát tài nguyên. [Trang công bố tại IBM Research](https://research.ibm.com/publications/an-updated-performance-comparison-of-virtual-machines-and-linux-containers).

### Ví dụ minh họa

- **Ảo hóa máy:** Một máy chủ vật lý chạy nhiều VM; mỗi VM có hệ điều hành khách và tài nguyên được cấp.
- **Ảo hóa ở mức hệ điều hành:** Nhiều container cung cấp môi trường thực thi được cách ly và dùng chung nhân hệ điều hành của máy chủ.

VM và container có cơ chế cách ly khác nhau. Khi mô tả kiến trúc hoặc đánh giá hiệu năng, nhóm cần nêu cụ thể môi trường sử dụng.

## 6. Quan hệ giữa các khái niệm

### Bảng phân biệt

| Khái niệm | Câu hỏi được trả lời | Ví dụ |
|---|---|---|
| Tenant | Ai sử dụng hệ thống và được quản lý trong phạm vi nào? | Trường A |
| Service | Hệ thống cung cấp chức năng gì? | Quản lý điểm |
| Service instance | Hiện thân triển khai cụ thể nào thực hiện chức năng đó? | `grade-01` |
| VM/container | Instance được đặt trong môi trường thực thi nào? | Container C1 |
| Ảo hóa | Tài nguyên hoặc môi trường logic được tạo và quản lý bằng cách nào? | Ảo hóa ở mức hệ điều hành |

### Ví dụ xuyên suốt

Trường A và Trường B là hai tenant cùng sử dụng dịch vụ quản lý điểm. Dịch vụ này có ba instance chạy trong ba container. Yêu cầu của hai trường được phân phối đến các instance, còn dữ liệu và quyền truy cập được kiểm soát theo tenant.

Trong một phương án khác, nhóm có thể cấp một tập instance riêng cho từng tenant. Quan hệ tenant–instance phải được mô tả trong kiến trúc, không mặc định là một–một.

Kabbedijk và cộng sự [1], tại mục 5, chủ động không giới hạn multi-tenancy vào một instance duy nhất và yêu cầu xác định tầng tài nguyên nào được chia sẻ. Khi gọi hệ thống là đa thuê bao, báo cáo cần nói rõ việc chia sẻ diễn ra ở tầng ứng dụng, dịch vụ, cơ sở dữ liệu hay hạ tầng. [Bản thảo toàn văn, mục 5](https://pure.tudelft.nl/ws/portalfiles/portal/47060994/kabbedijkJSS_2.pdf).

### Quy ước áp dụng trong kiến trúc và báo cáo

1. Dùng “thuê bao (tenant)” ở lần xuất hiện đầu tiên; sau đó sử dụng thuật ngữ nhất quán.
2. Phân biệt tenant với tài khoản người dùng thuộc tenant.
3. Dùng “dịch vụ” cho đơn vị chức năng, “instance” cho hiện thân triển khai cụ thể.
4. Nếu nói về máy ảo, ghi rõ “VM instance” để tránh nhầm với service instance.
5. Nêu rõ quan hệ giữa tenant, dịch vụ và instance trong phần kiến trúc.
6. Nêu rõ tầng chia sẻ tài nguyên và loại ảo hóa sử dụng.

## 7. Multi-user, multi-instance và multi-tenant

### 7.1. Cơ sở học thuật và phạm vi định nghĩa

Bezemer và Zaidman [7], mục 1–2, phân biệt mô hình nhiều người dùng với mô hình mỗi tenant có instance riêng và mô hình chia sẻ instance giữa các tenant. Bài này dùng cách nhìn ở tầng ứng dụng. [Bản tác giả, trang 1–2](https://azaidman.github.io/publications/bezemerIWPSE2010.pdf).

Kabbedijk và cộng sự [1], mục 5 và Bảng 5, so sánh ba thuật ngữ theo chia sẻ tài nguyên và khả năng cấu hình. Định nghĩa tổng hợp của bài mở rộng multi-tenancy ra nhiều tầng và không buộc hệ thống có đúng một instance. [Bản thảo, trang PDF 18–19](https://pure.tudelft.nl/ws/portalfiles/portal/47060994/kabbedijkJSS_2.pdf).

Các định nghĩa làm việc dưới đây phân biệt ba trục: người dùng, số hiện thân triển khai và tổ chức thuê bao. Đây là cách tổng hợp cho nghiên cứu, không phải sao chép định nghĩa hoặc Bảng 5 của nguồn [1].

### 7.2. Multi-user — Đa người dùng

**Định nghĩa đề xuất:** Multi-user là đặc tính của hệ thống cho phép nhiều người dùng sử dụng các chức năng của hệ thống, với danh tính, phiên làm việc hoặc quyền truy cập được quản lý phù hợp.

Khái niệm này trả lời câu hỏi: hệ thống có phục vụ nhiều người dùng hay không? Nó chưa cho biết có bao nhiêu tổ chức khách hàng, bao nhiêu instance hoặc có phạm vi tenant riêng hay không.

**Ví dụ do báo cáo xây dựng:** Trường A có 200 giáo viên đăng nhập vào hệ thống quản lý điểm nội bộ. Hệ thống hỗ trợ nhiều người dùng nhưng mới phục vụ một trường. Tình huống này đủ để minh họa multi-user, chưa đủ để kết luận multi-tenant ở tầng ứng dụng.

**Đối chiếu nguồn:** Trong mô hình SaaS của [7], multi-user được phân biệt với multi-tenant bằng mức cấu hình theo nhu cầu khách hàng. Định nghĩa làm việc ở đây rộng hơn: không lấy việc thiếu cấu hình làm điều kiện bắt buộc cho mọi hệ thống multi-user.

### 7.3. Multi-instance — Đa thể hiện triển khai

**Định nghĩa đề xuất:** Multi-instance là đặc tính của một cấu hình triển khai có nhiều instance của cùng ứng dụng hoặc dịch vụ được triển khai trong phạm vi đang xét, trong đó từng instance có thể được phân biệt và quản lý riêng.

Cần nói rõ phạm vi: nhiều instance của dịch vụ quản lý điểm hay nhiều instance của toàn bộ ứng dụng. Việc một hệ thống có nhiều dịch vụ khác nhau, mỗi dịch vụ chỉ có một instance, không tự động chứng minh một dịch vụ cụ thể là multi-instance.

Có hai cách sử dụng cần phân biệt:

- **Trong mô hình cung cấp SaaS theo [7]:** mỗi tenant được cấp instance ứng dụng riêng.
- **Trong triển khai và mở rộng dịch vụ:** cùng một dịch vụ có nhiều instance để phân phối tải. Nguồn [4], phần “Scalability”, minh họa trường hợp nhân một dịch vụ thành ba instance. [Bản tác giả](https://arxiv.org/pdf/1702.07149).

**Ví dụ do báo cáo xây dựng:** Chỉ phục vụ Trường A, hệ thống chạy ba instance quản lý điểm sau bộ cân bằng tải. Đây là multi-instance của dịch vụ quản lý điểm, nhưng số tenant vẫn là một.

**Ví dụ khác:** Trường A có instance A1 và Trường B có instance B1. Đây là multi-instance theo cách cấp instance riêng từng khách hàng. Cần kiểm tra tầng chia sẻ tài nguyên trước khi mô tả toàn hệ thống là multi-tenant.

### 7.4. Multi-tenant — Đa thuê bao

**Định nghĩa đề xuất:** Multi-tenant là đặc tính của hệ thống cho phép nhiều tenant sử dụng chung một hoặc nhiều lớp tài nguyên, đồng thời duy trì phạm vi quản lý logic riêng và cơ chế cách ly, cấu hình theo tenant tại tầng được xác định.

Định nghĩa làm việc này kết hợp nội dung về chia sẻ và cấu hình từ [1] với vai trò cách ly tenant từ [2]. Khi áp dụng, nhóm phải ghi rõ tầng nào được chia sẻ và thuộc tính cách ly nào được yêu cầu.

**Ví dụ do báo cáo xây dựng:** Trường A và Trường B dùng cùng tập instance quản lý điểm. Hệ thống xác định tenant của yêu cầu, áp dụng quyền truy cập, dữ liệu và cấu hình theo trường. Đây là ví dụ multi-tenant ở tầng ứng dụng.

Trong ví dụ, dùng chung ứng dụng không có nghĩa hai trường được phép đọc dữ liệu của nhau. Ngược lại, chỉ có trường dữ liệu `tenant_id` chưa chứng minh hệ thống đã cách ly đúng; kiến trúc và kiểm tra truy cập phải thực thi được phạm vi tenant.

### 7.5. Single-tenant — Đơn thuê bao

**Định nghĩa đề xuất:** Single-tenant là đặc tính của một môi trường triển khai hoặc một đơn vị tài nguyên được dành riêng để phục vụ một tenant, tại tầng và trong phạm vi đang xét. Tenant đó có thể có nhiều người dùng và được phục vụ bởi một hoặc nhiều instance.

Cần phân biệt việc một hệ thống hiện chỉ có một khách hàng với mô hình dành riêng môi trường cho khách hàng đó. Một nền tảng được thiết kế để chia sẻ giữa nhiều tenant vẫn có thể mới tiếp nhận một tenant; số tenant quan sát được ở thời điểm đó chưa đủ để kết luận kiến trúc là single-tenant.

**Căn cứ khoa học:** Bezemer và Zaidman [7], mục 2.3.2, mô tả môi trường single-tenant trong đó mỗi tenant có instance ứng dụng riêng, có thể được tùy chỉnh. Mục 2.3.3 cũng thảo luận ứng dụng single-tenant có nhiều instance đang chạy. Định nghĩa ở đây là cách tổng hợp có nêu phạm vi, không phải câu trích nguyên văn. [Bản tác giả, trang 2](https://azaidman.github.io/publications/bezemerIWPSE2010.pdf).

**Ví dụ do báo cáo xây dựng:** Trường A được cấp riêng một môi trường quản lý điểm với ba instance để phân phối tải. Cả ba instance chỉ phục vụ Trường A, nơi có 200 giáo viên sử dụng. Môi trường này là single-tenant ở tầng ứng dụng, đồng thời multi-user và multi-instance.

**Đối chiếu với multi-tenant:**

| Tiêu chí | Single-tenant | Multi-tenant |
|---|---|---|
| Phân bổ ở tầng đang xét | Môi trường hoặc tài nguyên được dành riêng cho một tenant | Tài nguyên được chia sẻ giữa nhiều tenant |
| Số người dùng trong mỗi tenant | Có thể một hoặc nhiều | Có thể một hoặc nhiều |
| Số instance phục vụ | Có thể một hoặc nhiều | Có thể một hoặc nhiều |
| Ví dụ ở tầng ứng dụng | Tập instance dành riêng cho Trường A | Tập instance dùng chung giữa Trường A và Trường B, có cơ chế quản lý và cách ly theo tenant |
| Quan hệ với hạ tầng | Ứng dụng dành riêng vẫn có thể chạy trên hạ tầng chia sẻ | Cần nêu rõ tầng tài nguyên được chia sẻ |

Bảng là tổng hợp theo định nghĩa làm việc của báo cáo. Không suy ra rằng single-tenant phải có máy chủ vật lý riêng, chỉ có một người dùng hoặc chỉ có một instance. Cũng không suy ra single-tenant tự động bảo đảm an toàn hay hiệu năng; các thuộc tính đó phụ thuộc cơ chế triển khai cụ thể.

Ví dụ, instance A chỉ phục vụ Trường A và instance B chỉ phục vụ Trường B, nhưng cả hai chạy trên cùng một máy chủ: mỗi instance là single-tenant ở tầng ứng dụng, còn hạ tầng chia sẻ cần được phân tích riêng. Vì vậy, kết luận nên viết đầy đủ “single-tenant ở tầng ứng dụng” thay vì mặc định mọi tầng đều được dành riêng.
## 8. So sánh multi-user, multi-instance và multi-tenant

### 8.1. Bảng so sánh khái niệm

Bảng dưới là tổng hợp phân tích của báo cáo từ các định nghĩa làm việc ở mục 7; không phải bảng chép lại từ bài báo.

| Tiêu chí | Multi-user | Multi-instance | Multi-tenant |
|---|---|---|---|
| Trọng tâm | Nhiều người dùng | Nhiều hiện thân triển khai của cùng đối tượng | Nhiều tenant cùng sử dụng tài nguyên ở tầng xác định |
| Đối tượng cần phân biệt | Người dùng, phiên, vai trò | Instance và vòng đời | Tenant và phạm vi quản lý của tenant |
| Có bắt buộc nhiều tổ chức khách hàng? | Không | Không | Không bắt buộc là tổ chức; bắt buộc nhiều tenant |
| Có bắt buộc nhiều instance? | Không | Có, trong cấu hình và phạm vi đang xét | Không; có thể dùng một hoặc nhiều instance |
| Có bắt buộc chia sẻ tài nguyên giữa các tenant? | Không suy ra từ thuật ngữ | Không suy ra từ thuật ngữ | Có, tại ít nhất một tầng được nêu rõ |
| Có bắt buộc mô hình dữ liệu theo tenant? | Không suy ra | Không suy ra | Phải có cách quản lý/cách ly theo tenant phù hợp tài nguyên; không bắt buộc một schema chung |
| Có bắt buộc mỗi tenant một instance? | Không | Chỉ khi chọn mô hình SaaS cấp instance riêng | Không |
| Ví dụ | 200 giáo viên dùng hệ thống của Trường A | Ba instance quản lý điểm phục vụ Trường A | Trường A và B dùng chung dịch vụ với phạm vi tenant riêng |

### 8.2. Bảng tình huống kết hợp

Các tình huống sau do báo cáo xây dựng. Việc đánh giá multi-tenant được thực hiện ở tầng ứng dụng, trừ nơi ghi chú khác.

| Tình huống | Multi-user | Multi-instance | Multi-tenant ở tầng ứng dụng |
|---|---|---|---|
| Một trường, nhiều giáo viên, một instance | Có | Không | Không |
| Một trường, nhiều giáo viên, ba instance | Có | Có | Không |
| Hai trường, mỗi trường nhiều người dùng, cùng một instance có cơ chế tenant | Có | Không | Có |
| Hai trường, mỗi trường nhiều người dùng, cùng dùng ba instance có cơ chế tenant | Có | Có | Có |
| Hai trường, mỗi trường một bản ứng dụng riêng và nhiều người dùng, hai bản chạy trên cùng máy chủ | Có | Có, xét toàn bộ triển khai | Mỗi instance là single-tenant; cần đánh giá riêng multi-tenancy ở hạ tầng |

Một hệ thống có thể đồng thời multi-user, multi-instance và multi-tenant. Ba thuật ngữ không tạo thành ba nhóm loại trừ lẫn nhau, cũng không tạo thành một thứ bậc mặc định.

### 8.3. Quan hệ với ảo hóa

Ảo hóa là cơ chế tổ chức tài nguyên và môi trường thực thi; ba đặc tính trên mô tả các khía cạnh khác của hệ thống. Trong mô hình nghiên cứu, cần kiểm tra từng khía cạnh độc lập:

- Một VM chạy hệ thống nội bộ có nhiều tài khoản có thể là multi-user và single-instance.
- Ba container chạy ba instance của dịch vụ cho một trường có thể là multi-instance nhưng single-tenant ở tầng ứng dụng.
- Một tiến trình ứng dụng phục vụ nhiều tenant có thể là multi-tenant ở tầng ứng dụng; tên gọi này không tự xác định nó chạy trên VM, container hay máy vật lý.
- Hai VM phục vụ hai tenant trên cùng máy vật lý có thể minh họa chia sẻ ở hạ tầng; không đủ để kết luận hai ứng dụng trong VM cùng chia sẻ instance ứng dụng.

Các ví dụ này là phân tích kiến trúc của báo cáo. Căn cứ về VM/container nằm ở [5]–[6]; căn cứ về yêu cầu nêu tầng chia sẻ của multi-tenancy nằm ở [1].

### 8.4. Cách mô tả đề xuất cho nghiên cứu

Khi mô tả một phương án cụ thể, nên ghi đủ: số tenant, số người dùng trong mỗi tenant, số instance của từng dịch vụ, cách ánh xạ tenant–instance, tầng chia sẻ tài nguyên và cơ chế cách ly.

Ví dụ mô tả một cấu hình giả định:

> Hệ thống hỗ trợ nhiều tenant, mỗi tenant có nhiều người dùng. Dịch vụ quản lý điểm được triển khai thành ba instance dùng chung giữa các tenant. Hệ thống xác định tenant của mỗi yêu cầu và thực thi kiểm soát truy cập, dữ liệu, cấu hình theo tenant. Mỗi instance được triển khai trong một container. Cấu hình này đồng thời có đặc tính multi-user, multi-instance và multi-tenant ở tầng ứng dụng.

Đoạn trên là mẫu mô tả giả định; chỉ áp dụng khi kiến trúc thực tế của nhóm đáp ứng các điều kiện đã nêu.

## 9. Cách trình bày định nghĩa trong nghiên cứu

Nhóm có thể sử dụng ba cách trình bày:

- **Kế thừa:** Giữ nội hàm của định nghĩa đã công bố và dẫn nguồn.
- **Điều chỉnh:** Nêu rõ kế thừa nguồn nào, bổ sung hoặc giới hạn điểm gì và lý do điều chỉnh.
- **Đề xuất mới:** Giải thích điểm khác biệt với nghiên cứu trước và lý do cần định nghĩa đó.

Có bài báo làm căn cứ giúp định nghĩa có cơ sở học thuật; tính mới của định nghĩa hoặc mô hình vẫn cần được lập luận riêng. Khi chỉ tổng hợp hoặc diễn đạt lại khái niệm đã có, cách ghi phù hợp là “nghiên cứu này sử dụng định nghĩa…” hoặc “trên cơ sở các nghiên cứu…, chúng tôi quy ước…”.

Các định nghĩa trong báo cáo này nên được giới thiệu là **định nghĩa làm việc được tổng hợp và điều chỉnh cho phạm vi nghiên cứu**, cho đến khi nhóm có lập luận riêng về đóng góp khái niệm mới.

## 10. Tài liệu tham khảo

[1] Kabbedijk, J., Bezemer, C. P., Jansen, S., & Zaidman, A. (2015). Defining multi-tenancy: A systematic mapping study on the academic and the industrial perspective. *Journal of Systems and Software, 100*, 139–148. [DOI](https://doi.org/10.1016/j.jss.2014.10.034). [Bản thảo tại TU Delft](https://pure.tudelft.nl/ws/portalfiles/portal/47060994/kabbedijkJSS_2.pdf).

[2] Sandholm, T., & Lee, D. (2014). Notes on Cloud computing principles. *Journal of Cloud Computing, 3*, Article 21. [DOI](https://doi.org/10.1186/s13677-014-0021-5).

[3] Papazoglou, M. P., & van den Heuvel, W.-J. (2007). Service oriented architectures: approaches, technologies and research issues. *The VLDB Journal, 16*, 389–415. [DOI](https://doi.org/10.1007/s00778-007-0044-3).

[4] Dragoni, N., Lanese, I., Larsen, S. T., Mazzara, M., Mustafin, R., & Safina, L. (2017). Microservices: How To Make Your Application Scale. *arXiv preprint*, arXiv:1702.07149. [Bản sử dụng trong báo cáo](https://arxiv.org/abs/1702.07149).

[5] Popek, G. J., & Goldberg, R. P. (1974). Formal requirements for virtualizable third generation architectures. *Communications of the ACM, 17*(7), 412–421. [DOI](https://doi.org/10.1145/361011.361073).

[6] Felter, W., Ferreira, A., Rajamony, R., & Rubio, J. (2015). An updated performance comparison of virtual machines and Linux containers. *2015 IEEE International Symposium on Performance Analysis of Systems and Software (ISPASS)*. [DOI](https://doi.org/10.1109/ISPASS.2015.7095802). [Trang công bố tại IBM Research](https://research.ibm.com/publications/an-updated-performance-comparison-of-virtual-machines-and-linux-containers).


[7] Bezemer, C.-P., & Zaidman, A. (2010). Multi-Tenant SaaS Applications: Maintenance Dream or Nightmare? *Proceedings of the Joint ERCIM Workshop on Software Evolution and International Workshop on Principles of Software Evolution (IWPSE-EVOL ’10)*. Position paper. [Bản tác giả toàn văn](https://azaidman.github.io/publications/bezemerIWPSE2010.pdf).


