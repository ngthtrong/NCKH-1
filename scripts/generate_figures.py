import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Set font family and style
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Segoe UI', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#CBD5E1'
plt.rcParams['axes.linewidth'] = 0.8

def generate_figure_5_2():
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(11, 13.5), constrained_layout=True)

    # Categories (top to bottom)
    categories = [
        'Gây nhiễu (Aggressor, 20 users)',
        'Chuẩn (Finance, 10 users)',
        'Lớn (Lotus, 20 users)',
        'Vừa (CTU Pool, 15 users)',
        'Nhỏ (Acme, 15 users)'
    ]
    y_pos = np.arange(len(categories))
    bar_height = 0.35

    # ----------------------------------------------------
    # Subplot (a): Median Latency p50
    # ----------------------------------------------------
    p50_baseline = [156.54, 211.34, 189.25, 187.99, 233.33]
    p50_proposed = [13.44, 63.99, 61.12, 60.55, 64.57]

    rects1 = ax1.barh(y_pos - bar_height/2, p50_baseline, bar_height, 
                      label='Baseline (Tắt Cache & Rate Limit)', color='#EF4444', alpha=0.85, edgecolor='#DC2626')
    rects2 = ax1.barh(y_pos + bar_height/2, p50_proposed, bar_height, 
                      label='Đề xuất (Bật Cache 2 tầng & Rate Limit)', color='#10B981', alpha=0.9, edgecolor='#059669')

    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(categories, fontsize=10.5)
    ax1.invert_yaxis()
    ax1.set_xlabel('Độ trễ trung vị p50 (ms) - Càng thấp càng tốt', fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_title('(a) Đối chiếu Độ trễ trung vị p50 giữa Cấu hình Cơ sở và Đề xuất', fontsize=12, fontweight='bold', pad=10)
    ax1.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax1.set_xlim(0, 310)

    for rect in rects1:
        w = rect.get_width()
        ax1.text(w + 3.5, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms", 
                 va='center', ha='left', fontsize=9.5, color='#B91C1C', fontweight='bold')
    for rect in rects2:
        w = rect.get_width()
        ax1.text(w + 3.5, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms", 
                 va='center', ha='left', fontsize=9.5, color='#047857', fontweight='bold')

    # Put legend at upper right where Aggressor bars are small
    ax1.legend(loc='upper right', framealpha=0.95, edgecolor='#CBD5E1', fontsize=9.5)

    # ----------------------------------------------------
    # Subplot (b): Tail Latency p95
    # ----------------------------------------------------
    p95_baseline = [556.55, 1291.25, 1257.16, 1166.02, 1526.48]
    p95_proposed = [124.54, 1138.35, 963.67, 934.57, 1135.73]

    rects3 = ax2.barh(y_pos - bar_height/2, p95_baseline, bar_height, 
                      label='Baseline (Độ trễ đuôi bị kéo dài do tranh chấp CSDL)', color='#F87171', alpha=0.85, edgecolor='#EF4444')
    rects4 = ax2.barh(y_pos + bar_height/2, p95_proposed, bar_height, 
                      label='Đề xuất (Bảo toàn cam kết SLA, trúng đệm)', color='#059669', alpha=0.9, edgecolor='#047857')

    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(categories, fontsize=10.5)
    ax2.invert_yaxis()
    ax2.set_xlabel('Độ trễ phân vị đuôi p95 (ms) - Càng thấp càng tốt', fontsize=11, fontweight='bold', labelpad=8)
    ax2.set_title('(b) Đối chiếu Độ trễ phân vị p95 (Tail Latency)', fontsize=12, fontweight='bold', pad=10)
    ax2.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax2.set_xlim(0, 2050)

    for rect in rects3:
        w = rect.get_width()
        ax2.text(w + 22, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms", 
                 va='center', ha='left', fontsize=9.5, color='#B91C1C', fontweight='bold')
    for rect in rects4:
        w = rect.get_width()
        ax2.text(w + 22, rect.get_y() + rect.get_height()/2, f"{w:.1f} ms", 
                 va='center', ha='left', fontsize=9.5, color='#065F46', fontweight='bold')

    # Put legend at upper right where Aggressor bars are small
    ax2.legend(loc='upper right', framealpha=0.95, edgecolor='#CBD5E1', fontsize=9.5)

    # ----------------------------------------------------
    # Subplot (c): Two-tier Cache Hit Rate
    # ----------------------------------------------------
    cache_categories = [
        'Thuê bao Lớn (t-lotus)',
        'Thuê bao Vừa (pool-demo)',
        'Thuê bao Nhỏ (t-acme)'
    ]
    c_pos = np.arange(len(cache_categories))
    l1_rates = [76.16, 97.27, 79.25]
    l2_rates = [0.93, 38.46, 0.00]

    rects5 = ax3.barh(c_pos - bar_height/2, l1_rates, bar_height, 
                      label='Tỷ lệ trúng L1 Caffeine (RAM tiến trình cực nhanh)', color='#3B82F6', alpha=0.9, edgecolor='#2563EB')
    rects6 = ax3.barh(c_pos + bar_height/2, l2_rates, bar_height, 
                      label='Tỷ lệ trúng L2 Redis (sau khi L1 trượt)', color='#8B5CF6', alpha=0.85, edgecolor='#7C3AED')

    ax3.set_yticks(c_pos)
    ax3.set_yticklabels(cache_categories, fontsize=10.5)
    ax3.invert_yaxis()
    ax3.set_xlabel('Tỷ lệ trúng bộ nhớ đệm (%) - Càng cao càng tốt', fontsize=11, fontweight='bold', labelpad=8)
    ax3.set_title('(c) Tỷ lệ trúng Bộ nhớ đệm Hai tầng (L1 Caffeine / L2 Redis) theo Nhóm Thuê bao', fontsize=12, fontweight='bold', pad=10)
    ax3.grid(axis='x', linestyle='--', alpha=0.5, color='#94A3B8')
    ax3.set_xlim(0, 120)

    for rect in rects5:
        w = rect.get_width()
        ax3.text(w + 1.2, rect.get_y() + rect.get_height()/2, f"{w:.2f}%", 
                 va='center', ha='left', fontsize=9.5, color='#1D4ED8', fontweight='bold')
    for rect in rects6:
        w = rect.get_width()
        ax3.text(w + 1.2, rect.get_y() + rect.get_height()/2, f"{w:.2f}%", 
                 va='center', ha='left', fontsize=9.5, color='#6D28D9', fontweight='bold')

    ax3.legend(loc='lower right', framealpha=0.95, edgecolor='#CBD5E1', fontsize=9.5)

    fig.savefig('output/hinh_5_2_doi_chieu_hieu_nang.png', dpi=300)
    plt.close(fig)
    print("Regenerated: output/hinh_5_2_doi_chieu_hieu_nang.png (300 DPI)")

if __name__ == '__main__':
    generate_figure_5_2()
