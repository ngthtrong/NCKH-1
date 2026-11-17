# -*- coding: utf-8 -*-
"""
Script to compile all .drawio diagrams in diagrams/chapter5 to high-resolution PNGs
using the official draw.io Desktop CLI.
DOES NOT MODIFY ANY FILE in diagrams/chapter5/.
Outputs to:
  - output/chapter5_png/
  - output/
"""

import os
import subprocess
import shutil

DRAWIO_EXE = r"C:\Users\Huynh Hong An\AppData\Local\Programs\draw.io\draw.io.exe"
SRC_DIR = r"D:\NCKH\diagrams\chapter5"
OUT_DIR = r"D:\NCKH\output\chapter5_png"
REPORT_IMG_DIR = r"D:\NCKH\output"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(REPORT_IMG_DIR, exist_ok=True)

# Mapping from source drawio file to target filenames
DIAGRAMS = [
    {
        "src": "Hinh_5.1_Kien_truc_moi_truong.drawio",
        "out_name": "Hinh_5.1_Kien_truc_moi_truong.png",
        "alias": "hinh_5_1_pipeline_thuc_nghiem.png"
    },
    {
        "src": "Hinh_5.2_Ban_do_thiet_ke_thuc_nghiem.drawio",
        "out_name": "Hinh_5.2_Ban_do_thiet_ke_thuc_nghiem.png",
        "alias": "hinh_5_2_ban_do_thiet_ke_kb1_kb4.png"
    },
    {
        "src": "Hinh_5.3_Dinh_danh_co_lap_RLS.drawio",
        "out_name": "Hinh_5.3_Dinh_danh_co_lap_RLS.png",
        "alias": "hinh_5_3_kiem_dinh_dinh_danh_csdl_rls.png"
    },
    {
        "src": "Hinh_5.4_Hieu_nang_lang_gieng_on_ao.drawio",
        "out_name": "Hinh_5.4_Hieu_nang_lang_gieng_on_ao.png",
        "alias": "hinh_5_4_do_tre_dieu_tiet_luu_luong.png"
    },
    {
        "src": "Hinh_5.5_Tuy_bien_dong_JSONB_WIP.drawio",
        "out_name": "Hinh_5.5_Tuy_bien_dong_JSONB_WIP.png",
        "alias": "hinh_5_5_tuy_bien_dong_jsonb_wip.png"
    }
]

def compile_all():
    print(f"[*] Starting Draw.io compilation using: {DRAWIO_EXE}")
    print(f"[*] Source directory (READ-ONLY, untouched): {SRC_DIR}")
    print(f"[*] Destination directory: {OUT_DIR}")
    print("-" * 70)

    for item in DIAGRAMS:
        src_path = os.path.join(SRC_DIR, item["src"])
        dst_path = os.path.join(OUT_DIR, item["out_name"])
        alias_path = os.path.join(REPORT_IMG_DIR, item["alias"])
        direct_out_path = os.path.join(REPORT_IMG_DIR, item["out_name"])

        if not os.path.exists(src_path):
            print(f"[!] Warning: {src_path} not found. Skipping.")
            continue

        print(f"[>] Compiling: {item['src']} ...")
        # Run draw.io desktop CLI to export PNG with scale 2.0 (high-res for print / report)
        cmd = [
            DRAWIO_EXE,
            "--export",
            "--format", "png",
            "--scale", "2",
            "--output", dst_path,
            src_path
        ]

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if res.returncode == 0 and os.path.exists(dst_path):
            size_kb = os.path.getsize(dst_path) / 1024
            print(f"    [✓] Compiled: {dst_path} ({size_kb:.1f} KB)")
            # Also copy to output/ for report compatibility
            shutil.copy2(dst_path, direct_out_path)
            shutil.copy2(dst_path, alias_path)
            print(f"    [✓] Linked to: {alias_path}")
        else:
            print(f"    [X] Error compiling {item['src']}: {res.stderr}")

    print("-" * 70)
    print("[✓] Compilation completed successfully!")

if __name__ == "__main__":
    compile_all()
