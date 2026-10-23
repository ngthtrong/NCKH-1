# Kết quả phân tích Bảng 6.3 (Kabbedijk)

Sinh bởi `mta_matrix.py`. Số liệu gốc: Kabbedijk (2015), Table 6.3, n = 16.

## 1. Điểm trung bình 17 tiêu chí (không trọng số)
| Kịch bản | Trung bình |
|---|---|
| S1 <AI,DD> | 3.32 |
| S2 <AI,DS> | 3.32 |
| S3 <AI,DB> | 3.41 |
| S4 <AI,DC> | 3.18 |
| Tham chiếu <AD,DD> | 3.62 |

## 2. Đối chiếu các con số K1/K2/K3 trong ghi chú của nhóm
K1 = <AI,DS>, K2 = <AI,DB>, K3 = <AI,DC>.
| Tiêu chí | K1 | K2 | K3 | Ghi chú của nhóm | Khớp? |
|---|---|---|---|---|---|
| Throughput | 3.0 | 3.0 | 3.0 | K2 3.5 vs K1 3.0 | SAI |
| Number of End-Users | 3.5 | 4.0 | 4.5 | K2 4.0 vs K1 3.0 | SAI |
| Resource Utilization | 3.0 | 4.0 | 4.5 | K2 4.0 vs K1 3.0 | đúng |
| Maintainability | 3.5 | 4.5 | 5.0 | K2 4.5 vs K1 3.5 | đúng |
| Monitoring | 3.0 | 4.0 | 5.0 | K2 4.0 vs K1 3.0 | đúng |
| Recoverability | 4.0 | 3.0 | 2.0 | K2 3.0 vs K1 4.0 | đúng |
| Confidentiality | 4.0 | 3.0 | 2.5 | K2 3.0 vs K1 4.0 | đúng |

## 3. Xếp hạng theo hồ sơ thuê bao — quy mô thiết kế (tiêu chí quy mô giữ nguyên trọng số)
| Hồ sơ | S1 <AI,DD> | S2 <AI,DS> | S3 <AI,DB> | S4 <AI,DC> | Thắng | Ổn định (Monte Carlo, w x U(0.5,1.5)) |
|---|---|---|---|---|---|---|
| Starter | 3.26 | 3.36 | 3.54 | 3.53 | **S3** | S3 59%, S4 41% |
| Professional | 3.31 | 3.30 | 3.35 | 3.07 | **S3** | S1 24%, S2 2%, S3 74% |
| Enterprise | 3.39 | 3.27 | 3.24 | 2.74 | **S1** | S1 100% |
| Uniform | 3.32 | 3.32 | 3.41 | 3.18 | **S3** | S1 8%, S2 1%, S3 92% |

## 3. Xếp hạng theo hồ sơ thuê bao — quy mô thực nghiệm 3-5 thuê bao (tiêu chí quy mô x0.25)
| Hồ sơ | S1 <AI,DD> | S2 <AI,DS> | S3 <AI,DB> | S4 <AI,DC> | Thắng | Ổn định (Monte Carlo, w x U(0.5,1.5)) |
|---|---|---|---|---|---|---|
| Starter | 3.41 | 3.28 | 3.24 | 2.80 | **S1** | S1 100% |
| Professional | 3.41 | 3.23 | 3.12 | 2.50 | **S1** | S1 100% |
| Enterprise | 3.46 | 3.23 | 3.11 | 2.41 | **S1** | S1 100% |
| Uniform | 3.44 | 3.26 | 3.17 | 2.58 | **S1** | S1 100% |

## 4. Tiêu chí làm đổi người thắng khi bỏ từng tiêu chí (quy mô thiết kế)
- Starter: thắng S3; bỏ Time Behavior -> S4; bỏ Availability -> S4; bỏ Recoverability -> S4; bỏ Confidentiality -> S4; bỏ Integrity -> S4; bỏ Authenticity -> S4; bỏ Portability -> S4; bỏ Variability -> S4; bỏ Diverse SLA -> S4; bỏ Software Complexity -> S4
- Professional: thắng S3; bỏ Resource Utilization -> S1; bỏ Number of Tenants -> S1; bỏ Number of End-Users -> S1; bỏ Maintainability -> S1; bỏ Deployment Time -> S1; bỏ Monitoring -> S1
- Enterprise: thắng S1; không có
- Uniform: thắng S3; bỏ Maintainability -> S1

## 5. Hybrid lý tưởng so với kiến trúc đơn tốt nhất, chỉ xét S2-S4 (CHƯA trừ chi phí phức tạp của hybrid)
| Cơ cấu thuê bao (Starter/Pro/Ent) | Quy mô | Đơn tốt nhất | Điểm | Hybrid lý tưởng | Chênh lệch |
|---|---|---|---|---|---|
| 80/18/2 (đại học: nhiều nhóm nhỏ) | thiết kế | S3 | 3.50 | 3.50 | +0.00 |
| 80/18/2 (đại học: nhiều nhóm nhỏ) | thực nghiệm | S2 | 3.27 | 3.27 | +0.00 |
| 50/40/10 | thiết kế | S3 | 3.44 | 3.44 | +0.00 |
| 50/40/10 | thực nghiệm | S2 | 3.26 | 3.26 | +0.00 |
| 34/33/33 (cân bằng) | thiết kế | S3 | 3.38 | 3.39 | +0.01 |
| 34/33/33 (cân bằng) | thực nghiệm | S2 | 3.25 | 3.25 | +0.00 |
| 0/100/0 (toàn Pro) | thiết kế | S3 | 3.35 | 3.35 | +0.00 |
| 0/100/0 (toàn Pro) | thực nghiệm | S2 | 3.23 | 3.23 | +0.00 |

Ghi chú: thang điểm 1-5; chênh lệch hybrid là cận trên, phải so với chi phí phức tạp (Software Complexity, Maintainability) mà hybrid phải gánh vì duy trì nhiều đường mã. Kabbedijk nêu rõ các mẫu hybrid CHƯA được đánh giá (mục 6.7, threat 1).
## 6. Chỉ xét kịch bản khả thi S2-S4 (S1 <AI,DD> chỉ là tham chiếu)
### quy mô thiết kế
| Hồ sơ | S2 <AI,DS> | S3 <AI,DB> | S4 <AI,DC> | Thắng | Monte Carlo |
|---|---|---|---|---|---|
| Starter | 3.36 | 3.54 | 3.53 | **S3** | S3 59%, S4 41% |
| Professional | 3.30 | 3.35 | 3.07 | **S3** | S2 11%, S3 89% |
| Enterprise | 3.27 | 3.24 | 2.74 | **S2** | S2 73%, S3 27% |
| Uniform | 3.32 | 3.41 | 3.18 | **S3** | S2 2%, S3 98% |

Hối tiếc tối đa nếu dùng MỘT kiến trúc cho cả ba lớp (thang 1-5, càng nhỏ càng tốt):
- S3 <AI,DB>: 0.03 (lớp Enterprise)
- S2 <AI,DS>: 0.18 (lớp Starter)
- S4 <AI,DC>: 0.53 (lớp Enterprise)

### quy mô thực nghiệm 3-5 thuê bao
| Hồ sơ | S2 <AI,DS> | S3 <AI,DB> | S4 <AI,DC> | Thắng | Monte Carlo |
|---|---|---|---|---|---|
| Starter | 3.28 | 3.24 | 2.80 | **S2** | S2 85%, S3 15% |
| Professional | 3.23 | 3.12 | 2.50 | **S2** | S2 100% |
| Enterprise | 3.23 | 3.11 | 2.41 | **S2** | S2 100% |
| Uniform | 3.26 | 3.17 | 2.58 | **S2** | S2 99%, S3 1% |

Hối tiếc tối đa nếu dùng MỘT kiến trúc cho cả ba lớp (thang 1-5, càng nhỏ càng tốt):
- S2 <AI,DS>: 0.00 (lớp Starter)
- S3 <AI,DB>: 0.13 (lớp Enterprise)
- S4 <AI,DC>: 0.83 (lớp Enterprise)

### Điểm lật theo quy mô: hệ số f nhân vào trọng số 6 tiêu chí phụ thuộc quy mô để S3 <AI,DB> vượt S2 <AI,DS> (f = 1 là trọng số thiết kế đầy đủ)
- Starter: f* = 0.35
- Professional: f* = 0.71
- Enterprise: f* = 1.25
- Uniform: f* = 0.57

### Điểm lật S3 <AI,DB> so với S4 <AI,DC> (S4 vượt S3 khi f lớn hơn f*)
- Starter: S4 vượt S3 khi f > 1.04
- Professional: S4 vượt S3 khi f > 2.17
- Enterprise: S4 vượt S3 khi f > 4.70
- Uniform: S4 vượt S3 khi f > 1.89

