#!/usr/bin/env python3
"""
按页拆分词汇文件，每页30条，加速前端加载
同时生成紧凑格式的 JSON（去掉空格）
"""
import json
import gzip
import io
from pathlib import Path

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"

PAGE_SIZE = 30  # 每页条数
CHUNK_SIZE = 1000  # 每个文件条数（内存中分页的块大小）

def main():
    for level in ["n5", "n4", "n3", "n2", "n1"]:
        src = DATA_DIR / f"words_{level}.json"
        if not src.exists():
            continue
        
        with open(src, "r", encoding="utf-8") as f:
            words = json.load(f)
        
        total = len(words)
        print(f"\n{level.upper()}: {total} 条")
        
        # 按块拆分
        chunk_num = 0
        for i in range(0, total, CHUNK_SIZE):
            chunk = words[i:i+CHUNK_SIZE]
            chunk_num += 1
            
            # 紧凑 JSON（无空格）
            json_str = json.dumps(chunk, ensure_ascii=False, separators=(',', ':'))
            
            # gzip 压缩
            gz_path = DATA_DIR / f"words_{level}_c{chunk_num:03d}.json.gz"
            with gzip.open(gz_path, "wt", encoding="utf-8") as f:
                f.write(json_str)
            
            size_kb = gz_path.stat().st_size / 1024
            print(f"  Chunk {chunk_num}: {len(chunk)} 条, {size_kb:.1f} KB")
        
        # 删除原始大文件
        src.unlink()
        print(f"  已删除 {src.name}")

if __name__ == "__main__":
    main()
