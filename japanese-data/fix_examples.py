#!/usr/bin/env python3
"""
修复导入词汇的例句格式
将英文例句从 jp 字段移到 en 字段
"""
import json
from pathlib import Path

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"


def fix_examples(examples: list) -> list:
    """修复例句格式"""
    fixed = []
    for ex in examples:
        jp = ex.get("jp", "")
        en = ex.get("en", "")

        # 如果 jp 是英文，en 是空，交换它们
        if jp and not en and (jp.startswith("The ") or jp.startswith("I ") or jp.startswith("This ") or jp.startswith("It ")):
            en = jp
            jp = ""

        # 如果 jp 包含英文，尝试分离
        if jp and not en:
            # 检查是否是纯英文
            if jp.isascii():
                en = jp
                jp = ""

        fixed.append({"jp": jp, "en": en})

    return fixed


def main():
    words_file = DATA_DIR / "words.json"

    with open(words_file, "r", encoding="utf-8") as f:
        words = json.load(f)

    print(f"词汇总数: {len(words)}")

    fixed_count = 0
    for word in words:
        if "examples" in word:
            original = word["examples"]
            fixed = fix_examples(original)
            if fixed != original:
                word["examples"] = fixed
                fixed_count += 1

    with open(words_file, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"修复例句: {fixed_count} 条")

    # 显示修复后的示例
    print("\n=== 修复后示例 ===")
    for w in words[903:906]:
        print(f"  {w['word']}: {w['examples']}")


if __name__ == "__main__":
    main()
