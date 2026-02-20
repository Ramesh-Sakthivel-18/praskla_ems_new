import os
import re

bo_dir = r"d:\ramesh\praskla\hikvision-ems-full\frontend\app\business-owner"

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Generic theme change
    # Replace amber/orange with blue
    new_content = re.sub(r"amber-(\d+)", r"blue-\1", content)
    new_content = re.sub(r"orange-(\d+)", r"blue-\1", new_content)

    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Processed {file_path}")

for root, _, files in os.walk(bo_dir):
    for str_file in files:
        if str_file == "page.jsx":
            process_file(os.path.join(root, str_file))

print("Done")
