#!/usr/bin/env python3
"""
从 AnchorI/jlpt-kanji-dictionary 导入 22 万条日语词汇
转换格式并去重后写入 words.json
"""
import json
import requests
import zipfile
import io
from pathlib import Path
from datetime import date

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"

# 级别映射：根据词性/频率简单推断
def infer_level(kanji: str, pos: str) -> str:
    """简单推断 JLPT 级别"""
    # 根据词性粗略推断
    if "n" in pos and len(kanji) <= 2:
        return "N5"
    elif len(kanji) <= 3:
        return "N4"
    elif len(kanji) <= 4:
        return "N3"
    elif len(kanji) <= 6:
        return "N2"
    else:
        return "N1"


def main():
    print("=== 下载 AnchorI/jlpt-kanji-dictionary ===")

    url = "https://github.com/AnchorI/jlpt-kanji-dictionary/archive/refs/heads/main.zip"
    resp = requests.get(url, timeout=30)
    z = zipfile.ZipFile(io.BytesIO(resp.content))

    # 收集所有词汇
    all_dict_words = []
    for name in z.namelist():
        if "dictionary_part_" in name and name.endswith(".json"):
            with z.open(name) as f:
                data = json.loads(f.read().decode("utf-8"))
                all_dict_words.extend(data)

    print(f"下载完成: {len(all_dict_words)} 条")

    # 读取现有数据
    words_file = DATA_DIR / "words.json"
    with open(words_file, "r", encoding="utf-8") as f:
        existing_words = json.load(f)

    existing_max_id = max(w["id"] for w in existing_words)
    existing_word_set = {w["word"] for w in existing_words}

    print(f"现有词汇: {len(existing_words)} 条")
    print(f"最大 ID: {existing_max_id}")

    # 转换格式并去重
    new_words = []
    skipped = 0
    for item in all_dict_words:
        kanji = item.get("kanji", "")
        reading = item.get("reading", "")
        glossary = item.get("glossary_en", [])

        if not kanji or not reading:
            skipped += 1
            continue

        # 跳过已存在的
        if kanji in existing_word_set:
            skipped += 1
            continue

        # 提取释义（取第一个英文释义）
        meaning = ""
        for g in glossary:
            # glossary 包含释义和例句，取第一个非空且不像例句的
            if g and not g.startswith("The ") and not g.startswith("その"):
                meaning = g
                break
        if not meaning and glossary:
            meaning = glossary[0]

        # 提取例句
        examples = []
        for g in glossary:
            if g.startswith("The ") or g.startswith("その"):
                # 例句格式：日语 + 英语
                examples.append({"jp": g, "en": ""})
                if len(examples) >= 2:
                    break

        # 如果没有例句，创建一个简单例句
        if not examples:
            examples = [
                {"jp": f"{kanji}のことです。", "en": f"It is {meaning}."},
                {"jp": f"{kanji}を使ってください。", "en": f"Please use {meaning}."},
            ]

        # 推断级别
        level = infer_level(kanji, item.get("pos", ""))

        existing_max_id += 1
        existing_word_set.add(kanji)

        new_words.append({
            "id": existing_max_id,
            "word": kanji,
            "reading": reading,
            "meaning": meaning,
            "level": level,
            "isImportant": False,
            "examples": examples,
        })

    print(f"\n新增词汇: {len(new_words)} 条")
    print(f"跳过（重复/无效）: {skipped} 条")

    # 合并并保存
    all_words = existing_words + new_words

    with open(words_file, "w", encoding="utf-8") as f:
        json.dump(all_words, f, ensure_ascii=False, indent=2)

    print(f"\n保存完成！总计: {len(all_words)} 条")

    # 显示新增的示例
    print("\n=== 新增词汇示例 ===")
    for w in new_words[:5]:
        print(f"  [{w['level']}] {w['word']} ({w['reading']}) - {w['meaning']}")


if __name__ == "__main__":
    main()
