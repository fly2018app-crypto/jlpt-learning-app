#!/usr/bin/env python3
"""
从 OpenJLPT 导入语法和词汇数据
"""
import json
import requests
import zipfile
import io
from pathlib import Path

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"


def main():
    print("=== 下载 OpenJLPT ===")

    url = "https://github.com/evanclan/OpenJLPT/archive/refs/heads/main.zip"
    resp = requests.get(url, timeout=30)
    z = zipfile.ZipFile(io.BytesIO(resp.content))

    # ========== 导入语法 ==========
    grammar_file = DATA_DIR / "grammar.json"
    with open(grammar_file, "r", encoding="utf-8") as f:
        existing_grammar = json.load(f)

    existing_max_id = max(g["id"] for g in existing_grammar)
    existing_titles = {g["title"] for g in existing_grammar}

    print(f"现有语法: {len(existing_grammar)} 条")

    new_grammar = []
    for name in z.namelist():
        if "grammar" in name and name.endswith(".json") and "data" in name:
            with z.open(name) as f:
                data = json.loads(f.read().decode("utf-8"))
                for item in data:
                    pattern = item.get("pattern", "")
                    meaning = item.get("meaning", "")
                    formation = item.get("formation", "")
                    examples = item.get("examples", [])
                    level = item.get("level", "N0")

                    if not pattern or pattern in existing_titles:
                        continue

                    existing_max_id += 1
                    existing_titles.add(pattern)

                    # 转换例句格式
                    formatted_examples = []
                    for ex in examples:
                        formatted_examples.append({
                            "jp": ex.get("ja", ""),
                            "en": ex.get("en", ""),
                        })

                    if not formatted_examples:
                        formatted_examples = [
                            {"jp": f"{pattern}の例文", "en": f"Example for {meaning}"}
                        ]

                    new_grammar.append({
                        "id": existing_max_id,
                        "title": pattern,
                        "meaning": meaning,
                        "level": level,
                        "isImportant": False,
                        "explanation": formation,
                        "patterns": [formation] if formation else [],
                        "examples": formatted_examples,
                        "notes": "",
                    })

    all_grammar = existing_grammar + new_grammar
    with open(grammar_file, "w", encoding="utf-8") as f:
        json.dump(all_grammar, f, ensure_ascii=False, indent=2)

    print(f"新增语法: {len(new_grammar)} 条")
    print(f"语法总计: {len(all_grammar)} 条")

    # ========== 导入词汇 ==========
    words_file = DATA_DIR / "words.json"
    with open(words_file, "r", encoding="utf-8") as f:
        existing_words = json.load(f)

    existing_word_max_id = max(w["id"] for w in existing_words)
    existing_word_set = {w["word"] for w in existing_words}

    print(f"\n现有词汇: {len(existing_words)} 条")

    new_words = []
    for name in z.namelist():
        if "vocab" in name and name.endswith(".json") and "data" in name:
            with z.open(name) as f:
                data = json.loads(f.read().decode("utf-8"))
                for item in data:
                    word = item.get("word", "")
                    reading = item.get("reading", "")
                    meanings = item.get("meanings", [])
                    examples = item.get("examples", [])
                    level = item.get("level", "N0")

                    if not word or word in existing_word_set:
                        continue

                    existing_word_max_id += 1
                    existing_word_set.add(word)

                    meaning = meanings[0] if meanings else ""

                    formatted_examples = []
                    for ex in examples:
                        formatted_examples.append({
                            "jp": ex.get("ja", ""),
                            "en": ex.get("en", ""),
                        })

                    if not formatted_examples:
                        formatted_examples = [
                            {"jp": f"{word}のことです。", "en": f"It is {meaning}."}
                        ]

                    new_words.append({
                        "id": existing_word_max_id,
                        "word": word,
                        "reading": reading,
                        "meaning": meaning,
                        "level": level,
                        "isImportant": False,
                        "examples": formatted_examples,
                    })

    all_words = existing_words + new_words
    with open(words_file, "w", encoding="utf-8") as f:
        json.dump(all_words, f, ensure_ascii=False, indent=2)

    print(f"新增词汇: {len(new_words)} 条")
    print(f"词汇总计: {len(all_words)} 条")

    # 显示示例
    print("\n=== 新增语法示例 ===")
    for g in new_grammar[:3]:
        print(f"  [{g['level']}] {g['title']} - {g['meaning']}")

    print("\n=== 新增词汇示例 ===")
    for w in new_words[:3]:
        print(f"  [{w['level']}] {w['word']} ({w['reading']}) - {w['meaning']}")


if __name__ == "__main__":
    main()
