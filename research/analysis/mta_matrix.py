#!/usr/bin/env python3
"""Phân tích Bảng 6.3 (MTA Decision Matrix) của Kabbedijk (2015), chương 6.

Nguồn số liệu: J. Kabbedijk, "Variability in Multi-Tenant Enterprise Software",
PhD thesis, Utrecht University, 2015, Table 6.3 (n = 16 chuyên gia, thang 1 = tác động
bất lợi ... 5 = tác động tích cực). Thứ tự cột (đã đối chiếu với các giá trị
K1/K2/K3 trong ghi chú của nhóm và với tính đơn điệu của hàng Variability):
    DD: AD, AS, AI | DS: AD, AS, AI | DB: AD, AS, AI | DC: AD, AS, AI

Script chỉ dùng thư viện chuẩn. Chạy: python3 mta_matrix.py [--md results.md]

Lưu ý phương pháp: đây là công cụ hỗ trợ quyết định (MAAM, Kabbedijk mục 6.3), không phải
phép đo trên hệ thống của nhóm. Trọng số là GIẢ ĐỊNH của nhóm và được kiểm tra độ nhạy.
"""
import random
import statistics
import sys

COLS = [
    ("AD", "DD"), ("AS", "DD"), ("AI", "DD"),
    ("AD", "DS"), ("AS", "DS"), ("AI", "DS"),
    ("AD", "DB"), ("AS", "DB"), ("AI", "DB"),
    ("AD", "DC"), ("AS", "DC"), ("AI", "DC"),
]

# (criterion, 12 values, sigma^2)  -- chép nguyên từ Table 6.3
MATRIX = [
    ("Time Behavior",        [5.0, 4.0, 4.0, 4.0, 3.0, 3.0, 4.0, 3.0, 3.0, 3.5, 3.0, 2.5], 0.5),
    ("Resource Utilization", [2.0, 2.5, 3.0, 2.5, 3.0, 3.0, 3.0, 3.0, 4.0, 3.0, 3.0, 4.5], 0.4),
    ("Throughput",           [4.5, 3.0, 3.0, 4.0, 3.0, 3.0, 3.5, 3.5, 3.0, 3.0, 3.0, 3.0], 0.2),
    ("Number of Tenants",    [1.0, 3.0, 3.0, 3.0, 3.5, 4.0, 3.0, 4.0, 4.0, 4.0, 4.0, 5.0], 1.0),
    ("Number of End-Users",  [2.5, 3.5, 3.0, 3.0, 3.5, 3.5, 3.5, 3.5, 4.0, 3.5, 4.0, 4.5], 0.3),
    ("Availability",         [4.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.5, 3.0, 3.0, 3.0], 0.1),
    ("Recoverability",       [5.0, 4.5, 4.5, 4.0, 4.0, 4.0, 3.0, 3.0, 3.0, 2.0, 2.0, 2.0], 1.1),
    ("Confidentiality",      [5.0, 4.5, 4.0, 4.0, 4.0, 4.0, 3.5, 3.0, 3.0, 2.0, 2.0, 2.5], 0.9),
    ("Integrity",            [4.5, 4.0, 3.0, 4.0, 3.5, 3.0, 3.5, 3.0, 3.0, 3.0, 2.5, 2.0], 0.5),
    ("Authenticity",         [4.5, 3.5, 3.0, 3.5, 3.0, 3.0, 4.0, 3.5, 3.0, 3.0, 3.0, 2.5], 0.3),
    ("Maintainability",      [1.5, 2.5, 3.0, 2.5, 3.0, 3.5, 2.5, 4.0, 4.5, 3.0, 4.0, 5.0], 1.0),
    ("Portability",          [5.0, 5.0, 4.5, 4.5, 4.5, 4.5, 4.0, 4.0, 4.0, 3.0, 3.0, 2.5], 0.7),
    ("Deployment Time",      [1.5, 3.0, 3.0, 2.5, 3.5, 4.0, 3.0, 4.0, 4.0, 3.0, 4.0, 5.0], 0.8),
    ("Variability",          [5.0, 4.0, 2.5, 5.0, 4.0, 2.0, 4.5, 3.5, 2.0, 2.5, 2.0, 1.0], 1.8),
    ("Diverse SLA",          [4.5, 4.0, 3.0, 4.0, 3.5, 2.5, 4.0, 3.0, 3.0, 3.0, 2.5, 2.0], 0.6),
    ("Software Complexity",  [5.0, 4.5, 4.0, 4.5, 4.5, 3.5, 4.0, 4.0, 3.0, 2.5, 2.5, 2.0], 0.9),
    ("Monitoring",           [1.0, 2.0, 3.0, 2.5, 3.0, 3.0, 3.0, 4.0, 4.0, 3.5, 4.0, 5.0], 1.1),
]
CRIT = [m[0] for m in MATRIX]
IDX = {c: i for i, c in enumerate(CRIT)}

# Tên kịch bản (chỉ các cột dùng chung thể hiện ứng dụng AI, cộng cột tham chiếu)
CAND = {
    "S1 <AI,DD>": ("AI", "DD"),
    "S2 <AI,DS>": ("AI", "DS"),   # database riêng / máy chủ chung  (SILO_DATABASE)
    "S3 <AI,DB>": ("AI", "DB"),   # schema riêng / database chung   (SCHEMA_PER_TENANT)
    "S4 <AI,DC>": ("AI", "DC"),   # schema chung + tenant_id        (POOL)
}
REF = ("AD", "DD")  # multi-instance thuần, tham chiếu


def col(a, d):
    return COLS.index((a, d))


def score(vec_col, weights):
    num = sum(weights[c] * MATRIX[IDX[c]][1][vec_col] for c in CRIT)
    return num / sum(weights.values())


# ---------------------------------------------------------------------------
# Hồ sơ trọng số (0..3). Đây là GIẢ ĐỊNH, lý do ghi trong research/04-*.md
# ---------------------------------------------------------------------------
PROFILES = {
    # nhiều thuê bao nhỏ, chi phí thấp, tùy biến ít
    "Starter": {
        "Time Behavior": 2, "Resource Utilization": 3, "Throughput": 2, "Number of Tenants": 3,
        "Number of End-Users": 2, "Availability": 2, "Recoverability": 1, "Confidentiality": 2,
        "Integrity": 2, "Authenticity": 2, "Maintainability": 3, "Portability": 1,
        "Deployment Time": 3, "Variability": 1, "Diverse SLA": 1, "Software Complexity": 3,
        "Monitoring": 3,
    },
    # vài chục thuê bao, cần dữ liệu riêng và tùy biến dữ liệu
    "Professional": {
        "Time Behavior": 2, "Resource Utilization": 2, "Throughput": 2, "Number of Tenants": 2,
        "Number of End-Users": 2, "Availability": 2, "Recoverability": 2, "Confidentiality": 3,
        "Integrity": 3, "Authenticity": 2, "Maintainability": 2, "Portability": 2,
        "Deployment Time": 2, "Variability": 3, "Diverse SLA": 2, "Software Complexity": 2,
        "Monitoring": 2,
    },
    # ít thuê bao, dữ liệu nhạy cảm/tuân thủ, khôi phục độc lập
    "Enterprise": {
        "Time Behavior": 3, "Resource Utilization": 1, "Throughput": 2, "Number of Tenants": 1,
        "Number of End-Users": 2, "Availability": 3, "Recoverability": 3, "Confidentiality": 3,
        "Integrity": 3, "Authenticity": 3, "Maintainability": 1, "Portability": 3,
        "Deployment Time": 1, "Variability": 3, "Diverse SLA": 3, "Software Complexity": 1,
        "Monitoring": 1,
    },
    "Uniform": {c: 1 for c in CRIT},
}

# Tiêu chí phụ thuộc quy mô: ít có khả năng phân biệt khi chỉ có 3-5 thuê bao
SCALE_DEPENDENT = ["Number of Tenants", "Number of End-Users", "Deployment Time",
                   "Monitoring", "Maintainability", "Resource Utilization"]


def scaled(weights, factor):
    w = dict(weights)
    for c in SCALE_DEPENDENT:
        w[c] = w[c] * factor
    return w


def rank(weights, cand=CAND):
    res = {n: score(col(*ad), weights) for n, ad in cand.items()}
    return sorted(res.items(), key=lambda kv: -kv[1])


def monte_carlo(weights, trials=20000, lo=0.5, hi=1.5, seed=7, cand=CAND):
    rng = random.Random(seed)
    wins = {n: 0 for n in cand}
    for _ in range(trials):
        w = {c: weights[c] * rng.uniform(lo, hi) for c in CRIT}
        best = max(cand, key=lambda n: score(col(*cand[n]), w))
        wins[best] += 1
    return {n: wins[n] / trials for n in cand}


def leave_one_out(weights, cand=CAND):
    """Bỏ lần lượt từng tiêu chí; trả về các tiêu chí làm đổi người thắng."""
    base = rank(weights, cand)[0][0]
    flips = []
    for c in CRIT:
        w = dict(weights)
        w[c] = 0
        if sum(w.values()) == 0:
            continue
        top = rank(w, cand)[0][0]
        if top != base:
            flips.append((c, top))
    return base, flips


def hybrid_gain(mix, scale_factor=1.0, cand=None):
    """So sánh điểm kỳ vọng của kiến trúc đơn tốt nhất với 'hybrid lý tưởng'
    (mỗi lớp thuê bao dùng kịch bản tốt nhất của lớp đó, CHƯA trừ chi phí phức tạp).
    mix = {Starter: p, Professional: q, Enterprise: r}. Mặc định chỉ xét kịch bản khả thi S2-S4."""
    cand = cand or FEAS
    per_class = {}
    for p, share in mix.items():
        w = scaled(PROFILES[p], scale_factor)
        per_class[p] = dict(rank(w, cand))
    single = {}
    for n in cand:
        single[n] = sum(mix[p] * per_class[p][n] for p in mix)
    best_single = max(single.items(), key=lambda kv: kv[1])
    hyb = sum(mix[p] * max(per_class[p].values()) for p in mix)
    return best_single, hyb, hyb - best_single[1], single


FEAS = {k: v for k, v in CAND.items() if not k.startswith("S1")}  # S1 chỉ là tham chiếu


def min_regret(cand, factor, classes=("Starter", "Professional", "Enterprise")):
    """Với mỗi kiến trúc đơn: hối tiếc của lớp c = (điểm tốt nhất của lớp c) - (điểm kiến trúc đó).
    Trả về {kiến trúc: (hối tiếc tối đa, lớp gây ra)}."""
    per = {c: dict(rank(scaled(PROFILES[c], factor), cand)) for c in classes}
    res = {}
    for n in cand:
        worst = max(((max(per[c].values()) - per[c][n]), c) for c in classes)
        res[n] = worst
    return res


def breakeven(pname, a="S3 <AI,DB>", b="S2 <AI,DS>", cand=CAND):
    """Hệ số f (nhân vào trọng số các tiêu chí phụ thuộc quy mô) tại đó a vượt b."""
    lo, hi = 0.0, 3.0
    fa = lambda f: score(col(*cand[a]), scaled(PROFILES[pname], f)) - score(col(*cand[b]), scaled(PROFILES[pname], f))
    if fa(lo) >= 0:
        return 0.0
    if fa(hi) < 0:
        return None
    for _ in range(50):
        mid = (lo + hi) / 2
        if fa(mid) < 0:
            lo = mid
        else:
            hi = mid
    return hi


def feasible_section(P):
    P("## 6. Chỉ xét kịch bản khả thi S2-S4 (S1 <AI,DD> chỉ là tham chiếu)")
    for regime, factor in (("quy mô thiết kế", 1.0), ("quy mô thực nghiệm 3-5 thuê bao", 0.25)):
        P(f"### {regime}")
        P("| Hồ sơ | S2 <AI,DS> | S3 <AI,DB> | S4 <AI,DC> | Thắng | Monte Carlo |")
        P("|---|---|---|---|---|---|")
        for pname in ("Starter", "Professional", "Enterprise", "Uniform"):
            w = scaled(PROFILES[pname], factor)
            r = dict(rank(w, FEAS))
            mc = monte_carlo(w, cand=FEAS)
            win = max(r, key=r.get)
            P(f"| {pname} | {r['S2 <AI,DS>']:.2f} | {r['S3 <AI,DB>']:.2f} | {r['S4 <AI,DC>']:.2f} | "
              f"**{win.split()[0]}** | " + ", ".join(f"{n.split()[0]} {mc[n]*100:.0f}%" for n in FEAS if mc[n] > 0.005) + " |")
        P("")
        mr = min_regret(FEAS, factor)
        P("Hối tiếc tối đa nếu dùng MỘT kiến trúc cho cả ba lớp (thang 1-5, càng nhỏ càng tốt):")
        for n, (v, c) in sorted(mr.items(), key=lambda kv: kv[1][0]):
            P(f"- {n}: {v:.2f} (lớp {c})")
        P("")
    P("### Điểm lật theo quy mô: hệ số f nhân vào trọng số 6 tiêu chí phụ thuộc quy mô "
      "để S3 <AI,DB> vượt S2 <AI,DS> (f = 1 là trọng số thiết kế đầy đủ)")
    for pname in ("Starter", "Professional", "Enterprise", "Uniform"):
        f = breakeven(pname, cand=FEAS)
        P(f"- {pname}: f* = {f:.2f}" if f is not None else f"- {pname}: S3 không vượt S2 ở bất kỳ f <= 3")
    P("")
    P("### Điểm lật S3 <AI,DB> so với S4 <AI,DC> (S4 vượt S3 khi f lớn hơn f*)")
    for pname in ("Starter", "Professional", "Enterprise", "Uniform"):
        lo, hi = 0.0, 6.0
        g = lambda f: (score(col(*FEAS['S4 <AI,DC>']), scaled(PROFILES[pname], f))
                       - score(col(*FEAS['S3 <AI,DB>']), scaled(PROFILES[pname], f)))
        if g(0.0) >= 0:
            P(f"- {pname}: S4 vượt S3 ở mọi f")
        elif g(hi) < 0:
            P(f"- {pname}: S4 không vượt S3 với f <= {hi:g}")
        else:
            for _ in range(50):
                mid = (lo + hi) / 2
                if g(mid) < 0:
                    lo = mid
                else:
                    hi = mid
            P(f"- {pname}: S4 vượt S3 khi f > {hi:.2f}")
    P("")


def main():
    out = []
    P = out.append

    # 1. Kiểm lại các con số trong ghi chú của nhóm --------------------------
    P("## 1. Điểm trung bình 17 tiêu chí (không trọng số)")
    P("| Kịch bản | Trung bình |")
    P("|---|---|")
    for n, ad in CAND.items():
        v = statistics.mean(m[1][col(*ad)] for m in MATRIX)
        P(f"| {n} | {v:.2f} |")
    v = statistics.mean(m[1][col(*REF)] for m in MATRIX)
    P(f"| Tham chiếu <AD,DD> | {v:.2f} |")
    P("")
    P("## 2. Đối chiếu các con số K1/K2/K3 trong ghi chú của nhóm")
    P("K1 = <AI,DS>, K2 = <AI,DB>, K3 = <AI,DC>.")
    P("| Tiêu chí | K1 | K2 | K3 | Ghi chú của nhóm | Khớp? |")
    P("|---|---|---|---|---|---|")
    claims = {
        "Throughput": ("K2 3.5 vs K1 3.0", None),
        "Number of End-Users": ("K2 4.0 vs K1 3.0", None),
        "Resource Utilization": ("K2 4.0 vs K1 3.0", True),
        "Maintainability": ("K2 4.5 vs K1 3.5", True),
        "Monitoring": ("K2 4.0 vs K1 3.0", True),
        "Recoverability": ("K2 3.0 vs K1 4.0", True),
        "Confidentiality": ("K2 3.0 vs K1 4.0", True),
    }
    for c, (txt, _) in claims.items():
        r = MATRIX[IDX[c]][1]
        k1, k2, k3 = r[col("AI", "DS")], r[col("AI", "DB")], r[col("AI", "DC")]
        ok = {"Throughput": (k2 == 3.5 and k1 == 3.0),
              "Number of End-Users": (k2 == 4.0 and k1 == 3.0),
              "Resource Utilization": (k2 == 4.0 and k1 == 3.0),
              "Maintainability": (k2 == 4.5 and k1 == 3.5),
              "Monitoring": (k2 == 4.0 and k1 == 3.0),
              "Recoverability": (k2 == 3.0 and k1 == 4.0),
              "Confidentiality": (k2 == 3.0 and k1 == 4.0)}[c]
        P(f"| {c} | {k1} | {k2} | {k3} | {txt} | {'đúng' if ok else 'SAI'} |")
    P("")

    # 2. Xếp hạng theo hồ sơ -------------------------------------------------
    for regime, factor in (("quy mô thiết kế (tiêu chí quy mô giữ nguyên trọng số)", 1.0),
                           ("quy mô thực nghiệm 3-5 thuê bao (tiêu chí quy mô x0.25)", 0.25)):
        P(f"## 3. Xếp hạng theo hồ sơ thuê bao — {regime}")
        P("| Hồ sơ | " + " | ".join(CAND) + " | Thắng | Ổn định (Monte Carlo, w x U(0.5,1.5)) |")
        P("|---|" + "---|" * (len(CAND) + 2))
        for pname in ("Starter", "Professional", "Enterprise", "Uniform"):
            w = scaled(PROFILES[pname], factor)
            r = dict(rank(w))
            mc = monte_carlo(w)
            win = max(r, key=r.get)
            cells = " | ".join(f"{r[n]:.2f}" for n in CAND)
            mcs = ", ".join(f"{n.split()[0]} {mc[n]*100:.0f}%" for n in CAND if mc[n] > 0.005)
            P(f"| {pname} | {cells} | **{win.split()[0]}** | {mcs} |")
        P("")

    # 3. Leave-one-out --------------------------------------------------------
    P("## 4. Tiêu chí làm đổi người thắng khi bỏ từng tiêu chí (quy mô thiết kế)")
    for pname in ("Starter", "Professional", "Enterprise", "Uniform"):
        base, flips = leave_one_out(PROFILES[pname])
        txt = "; ".join(f"bỏ {c} -> {t.split()[0]}" for c, t in flips) or "không có"
        P(f"- {pname}: thắng {base.split()[0]}; {txt}")
    P("")

    # 4. Hybrid ---------------------------------------------------------------
    P("## 5. Hybrid lý tưởng so với kiến trúc đơn tốt nhất, chỉ xét S2-S4 (CHƯA trừ chi phí phức tạp của hybrid)")
    P("| Cơ cấu thuê bao (Starter/Pro/Ent) | Quy mô | Đơn tốt nhất | Điểm | Hybrid lý tưởng | Chênh lệch |")
    P("|---|---|---|---|---|---|")
    mixes = {
        "80/18/2 (đại học: nhiều nhóm nhỏ)": {"Starter": .80, "Professional": .18, "Enterprise": .02},
        "50/40/10": {"Starter": .50, "Professional": .40, "Enterprise": .10},
        "34/33/33 (cân bằng)": {"Starter": 1 / 3, "Professional": 1 / 3, "Enterprise": 1 / 3},
        "0/100/0 (toàn Pro)": {"Starter": 0.0, "Professional": 1.0, "Enterprise": 0.0},
    }
    for label, mix in mixes.items():
        for fname, factor in (("thiết kế", 1.0), ("thực nghiệm", 0.25)):
            (bn, bs), hyb, gain, _ = hybrid_gain(mix, factor)
            P(f"| {label} | {fname} | {bn.split()[0]} | {bs:.2f} | {hyb:.2f} | +{gain:.2f} |")
    P("")
    P("Ghi chú: thang điểm 1-5; chênh lệch hybrid là cận trên, phải so với chi phí phức tạp "
      "(Software Complexity, Maintainability) mà hybrid phải gánh vì duy trì nhiều đường mã. "
      "Kabbedijk nêu rõ các mẫu hybrid CHƯA được đánh giá (mục 6.7, threat 1).")
    feasible_section(P)
    text = "\n".join(out)
    print(text)
    if "--md" in sys.argv:
        path = sys.argv[sys.argv.index("--md") + 1]
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("# Kết quả phân tích Bảng 6.3 (Kabbedijk)\n\n")
            fh.write("Sinh bởi `mta_matrix.py`. Số liệu gốc: Kabbedijk (2015), Table 6.3, n = 16.\n\n")
            fh.write(text + "\n")


if __name__ == "__main__":
    main()
