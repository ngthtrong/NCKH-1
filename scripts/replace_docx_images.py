import zipfile
import shutil
import os

def replace_images_in_docx(docx_path, image_replacements):
    """
    image_replacements: dict mapping internal path (e.g. 'word/media/image8.png')
                        to external replacement file path (e.g. 'output/hinh_5_2_doi_chieu_hieu_nang.png')
    """
    temp_docx = docx_path + '.temp.zip'
    
    with zipfile.ZipFile(docx_path, 'r') as zin:
        with zipfile.ZipFile(temp_docx, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in image_replacements:
                    new_file = image_replacements[item.filename]
                    with open(new_file, 'rb') as f:
                        data = f.read()
                    zout.writestr(item, data)
                    print(f"[{os.path.basename(docx_path)}] Replaced {item.filename} with {new_file} ({len(data)} bytes)")
                else:
                    zout.writestr(item, zin.read(item.filename))
                    
    # Replace original file with updated file
    os.replace(temp_docx, docx_path)
    print(f"[✓] Successfully updated images in {docx_path}")

def update_all_docx_images():
    img52 = 'output/hinh_5_2_doi_chieu_hieu_nang.png'
    img53 = 'output/hinh_5_3_so_sanh_kien_truc.png'

    # 1. Report_v2.docx
    replace_images_in_docx('output/Report_v2.docx', {
        'word/media/image8.png': img52,
        'word/media/image12.png': img53
    })

    # 2. Chuong_5_Ban_Moi_Nhat_Hoan_Chinh.docx
    replace_images_in_docx('output/Chuong_5_Ban_Moi_Nhat_Hoan_Chinh.docx', {
        'word/media/image1.png': img52,
        'word/media/image2.png': img53
    })

    # 3. Chuong_5_Ket_Qua_Thuc_Nghiem.docx
    replace_images_in_docx('output/Chuong_5_Ket_Qua_Thuc_Nghiem.docx', {
        'word/media/image1.png': img52,
        'word/media/image2.png': img53
    })

if __name__ == '__main__':
    update_all_docx_images()
