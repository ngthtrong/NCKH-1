
## Tôi có tự thuê VPS hoặc đăng ký bằng GitHub của bạn được không?

**Không.** Tôi không có trình duyệt nên không đăng nhập OAuth bằng GitHub được. Tôi cũng không tạo tài khoản, không chấp nhận điều khoản dịch vụ, không xác minh sinh viên hay nhập thông tin thanh toán thay bạn. Bạn đừng gửi mật khẩu hoặc token GitHub vào khung chat.

 **Phần tôi làm được** , sau khi bạn đã có VPS và tên miền, đều thực hiện qua SSH từ terminal này:

* Cài Docker, tường lửa, tắt đăng nhập bằng mật khẩu.
* Sửa mã cho môi trường production (mục NT-4.1).
* Triển khai stack với HTTPS và chạy smoke test.

Mỗi bước thay đổi trên VPS tôi sẽ hỏi bạn trước. Các secret sẽ được sinh thẳng trên VPS, không đi qua chat.

GitHub không chạy được stack này: GitHub Pages chỉ phục vụ trang tĩnh, còn Codespaces là môi trường phát triển.

## VPS cần cấu hình thế nào

Stack gồm PostgreSQL 18, hai tiến trình Java (API và worker), web, Caddy, MinIO, Prometheus và Grafana.

* **Tối thiểu 2 vCPU, 4 GB RAM, 40 GB SSD.** Nên dùng 8 GB nếu ngân sách cho phép.
* Ubuntu 24.04, IPv4 công khai, mở được cổng 80 và 443, đặt ở Việt Nam hoặc Singapore.
* Phải chạy ổn định ít nhất đến khi nghiệm thu xong.
* **Hai vấn đề sẽ sửa khi triển khai:**
  * Compose hiện không giới hạn bộ nhớ, mà mỗi JVM được phép dùng tới 75% RAM (`MaxRAMPercentage=75`). Trên máy 4 GB, hai JVM sẽ tranh nhau bộ nhớ.
  * Khi đo hiệu năng, k6 phải chạy từ một máy khác, không chạy trên chính VPS.
* Thuyết minh mục 19 không có khoản chi cho máy chủ hay tên miền. Chi phí này hoặc nhóm tự trả, hoặc hỏi lại GVHD.

## Nền tảng phù hợp

| Phương án                                                                          | Chi phí                                                                                                                                       | Ưu điểm                                                                                   | Nhược điểm                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VPS nhà cung cấp Việt Nam** (Vietnix, AZDIGI, BizFly Cloud, Viettel IDC…) | Trả theo tháng. Theo hiểu biết chung, gói 2 vCPU/4 GB thường vài trăm nghìn đồng một tháng; tôi chưa kiểm tra giá hiện tại | Chuyển khoản hoặc ví điện tử, không cần thẻ quốc tế; độ trễ thấp; ổn định | Tốn tiền                                                                                                                                                                                   |
| **Azure for Students**                                                          | Tín dụng $100 dùng trong 12 tháng, không cần thẻ                                                                                        | Miễn phí nếu được duyệt tư cách sinh viên                                          | Hay vướng quota hoặc cỡ VM theo region, phải thử vài region; nên đặt cảnh báo ngân sách                                                                                        |
| **Oracle Cloud Always Free**                                                    | Miễn phí                                                                                                                                     | Tài nguyên khá                                                                            | Từ 06/2026 hạn mức giảm còn 2 OCPU/12 GB, áp dụng thật từ 18/08/2026. Cần thẻ để xác minh, chip ARM, thường báo hết capacity. Không nên dùng cho đợt đo chính thức |
| Hetzner, DigitalOcean, Vultr, Lightsail                                               | Trả phí                                                                                                                                      | Có region Singapore                                                                         | Cần thẻ quốc tế. DigitalOcean hiện không còn trong danh sách GitHub Student Pack                                                                                                     |

**Khuyến nghị:** thuê VPS Việt Nam loại 2 vCPU/4–8 GB trong 2 tháng. Nếu không có ngân sách, dùng Azure for Students.

**Tên miền:**

* **`.id.vn`:** miễn phí 2 năm cho công dân Việt Nam từ 18–23 tuổi, mỗi người được 1 tên miền.
* **GitHub Student Pack:** miễn phí năm đầu cho `.me` (Namecheap), `.TECH` hoặc một số đuôi của Name.com.

## Các bước đăng ký

1. **GitHub Student Pack** (nếu chưa có). Vào `github.com/settings/education/benefits`, dùng email `@student.ctu.edu.vn` kèm ảnh thẻ sinh viên, bật 2FA, rồi chờ duyệt.
2. **Tên miền:**
   * Với `.id.vn`: đăng ký tại một nhà đăng ký được VNNIC ủy quyền (Tenten, iNET, PA Việt Nam, BKNS…), xác minh bằng CCCD.
   * Hoặc nhận tên miền miễn phí trong Student Pack.
   * Nên chọn tên ngắn.
3. **DNS:**
   * **Nên dùng Cloudflare (gói Free).** Thêm tên miền vào Cloudflare, đổi nameserver tại nhà đăng ký sang Cloudflare, rồi tạo bản ghi A `*` trỏ về IP của VPS, để chế độ **DNS only** (mây xám).
   * Tạo API token có quyền **Zone → DNS → Edit** cho tên miền đó, để Caddy cấp chứng chỉ HTTPS dạng wildcard. Giữ token để tự dán vào VPS, không gửi vào chat.
   * Nếu tên miền không chuyển được sang Cloudflare, tôi sẽ cấu hình Caddy xin chứng chỉ riêng cho từng subdomain; cách này không cần API DNS.
4. **VPS:**
   * Chọn Ubuntu 24.04, gói 2 vCPU/4 GB trở lên.
   * Nếu dùng Azure: chọn cỡ VM họ B còn trống, đăng nhập bằng khóa SSH, chỉ mở cổng 22 cho IP của bạn cùng hai cổng 80 và 443.
5. **Gửi tôi:** IP, tên user SSH và tên miền. Không gửi mật khẩu hay token. Tôi có thể tạo sẵn một khóa SSH riêng trên máy này để bạn dán public key vào VPS; bạn đồng ý thì tôi làm.

Theo CLAUDE.md, việc triển khai Internet đang tạm dừng cho đến khi nhóm quyết định. Nếu đây là quyết định D-2, tôi sẽ ghi vào `docs/research/decision-log.md` khi bạn xác nhận.

Nguồn:

* [GitHub Student Developer Pack](https://education.github.com/pack)
* [Azure for Students](https://azure.microsoft.com/en-us/free/students)
* [Q&amp;A về giới hạn VM của Azure for Students](https://learn.microsoft.com/en-au/answers/questions/5919729/azure-for-students-subscription-vm-validation)
* [InfoQ: Oracle giảm hạn mức Free Tier](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)
* [TerminalBytes: Oracle Free Tier 2026](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/)
* [Tenten: tên miền .ID.VN miễn phí](https://tenten.vn/vi/ten-mien/id-vn)
* [iNET: hướng dẫn đăng ký .ID.VN](https://helpdesk.inet.vn/knowledgebase/huong-dan-cach-dang-ky-ten-mien-idvn-tai-inet)
