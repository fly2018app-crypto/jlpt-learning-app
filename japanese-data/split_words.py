#!/usr/bin/env python3
"""
将大词汇文件按级别拆分成多个小文件，加速前端加载
"""
import json
from pathlib import Path

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"

def main():
    words_file = DATA_DIR / "words.json"
    
    with open(words_file, "r", encoding="utf-8") as f:
        words = json.load(f)
    
    print(f"总词汇数: {len(words)}")
    
    # 按级别分组
    by_level = {}
    for w in words:
        level = w.get("level", "N0")
        if level not in by_level:
            by_level[level] = []
        by_level[level].append(w)
    
    # 按级别保存到单独文件
    for level, level_words in sorted(by_level.items()):
        output_file = DATA_DIR / f"words_{level.lower()}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(level_words, f, ensure_ascii=False, indent=2)
        print(f"{level}: {len(level_words)} 条 -> {output_file.name}")
    
    # 同时保存一个只包含 id 和 word 的轻量索引文件
    index = [{"id": w["id"], "word": w["word"], "level": w.get("level", "N0")} for w in words]
    with open(DATA_DIR / "words_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\n索引文件: {len(index)} 条")

if __name__ == "__main__":
    main()
