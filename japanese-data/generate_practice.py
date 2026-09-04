#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JLPT 练习题生成器 - 使用 Groq API 生成 JLPT 风格的练习题
专门生成可直接塞进 App 的练习题 JSON（对接 main.js 的 TopicDetail 渲染）

用法:
    python generate_practice.py --level N2 --category 漢字読み --count 3 --output practice_n2_kanzireading.json
    python generate_practice.py --level N3 --category 文法 --count 3 --output practice_n3_grammar.json
    python generate_practice.py --level N1 --category 読解 --count 2 --output practice_n1_reading.json

生成的 JSON 格式:
{
  "title": "N2 漢字読み練習 - 第1回",
  "level": "N2",
  "type": "practice",
  "category": "漢字読み",
  "body": "次の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。",
  "questions": [
    {
      "question": "「絆」の読み方として最もよいものを1・2・3・4から一つ選びなさい。",
      "options": ["1. きずな", "2. くずな", "3. きずん", "4. くずん"],
      "answer": "1"
    }
  ]
}

对接 main.js TopicDetail:
  q.question  -> {{ q.question }}
  q.options   -> v-for 循环 options，显示每个 opt
  q.answer    -> opt.startsWith(q.answer) 判定 정답显示
  所以 answer 是选项编号 "1"/"2"/"3"/"4"，options 数组里对应项必须以该编号开头
"""

import json
import os
import sys
import re
import argparse
import urllib.request
from pathlib import Path

# 修复 Windows 编码
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ========== 配置 ==========
# Load .env from Hermes config dir (same as batch_generator.py)
ENV_PATH = Path.home() / "AppData" / "Local" / "hermes" / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "groq/compound-mini"
MAX_TOKENS = 4000

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"
PRACTICE_DIR = DATA_DIR / "practice"
PRACTICE_DIR.mkdir(parents=True, exist_ok=True)

# JLPT 各级别的题型分类
QUESTION_CATEGORIES = {
    "N5": [
        "漢字読み",       # 汉字读法
        "漢字書き",       # 汉字写法（读音选汉字）
        "文法",          # 语法填空
        "語彙",          # 词汇选择
        "読解",          # 短文阅读
    ],
    "N4": [
        "漢字読み",
        "漢字書き",
        "文法",
        "語彙",
        "読解",
    ],
    "N3": [
        "漢字読み",
        "漢字書き",
        "文法",
        "語彙",
        "読解",
    ],
    "N2": [
        "漢字読み",
        "漢字書き",
        "文法",
        "語彙",
        "読解",
    ],
    "N1": [
        "漢字読み",
        "漢字書き",
        "文法",
        "語彙",
        "読解",
        "表現",         # 表达/用法选择
    ],
}

# ========== API 调用 ==========
def call_groq(messages, max_tokens=MAX_TOKENS):
    import subprocess
    import time

    if not GROQ_API_KEY:
        print("错误: GROQ_API_KEY 环境变量未设置", file=sys.stderr)
        return None

    payload = json.dumps({
        "model": MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.75,
    })

    max_retries = 5
    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["curl", "-s", GROQ_API_URL,
                 "-H", f"Authorization: Bearer {GROQ_API_KEY}",
                 "-H", "Content-Type: application/json",
                 "-d", payload],
                capture_output=True, text=True, timeout=60,
                encoding='utf-8', errors='replace'
            )
            if result.returncode != 0:
                print(f"curl 失败: {result.stderr}", file=sys.stderr)
                return None

            data = json.loads(result.stdout)
            if "error" in data:
                err = data["error"]
                msg = err.get("message", "")
                if "rate_limit" in msg.lower() or err.get("code") == "rate_limit_exceeded":
                    wait = 30 * (attempt + 1)
                    print(f"限速了，等待 {wait}s 后重试 ({attempt+1}/{max_retries})...", file=sys.stderr)
                    time.sleep(wait)
                    continue
                print(f"API 错误: {err}", file=sys.stderr)
                return None
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"API 调用失败 ({attempt+1}): {e}", file=sys.stderr)
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                return None
    return None


def extract_json(text):
    """从 AI 输出中提取 JSON 数组"""
    if not text:
        return None

    # 尝试直接解析整个文本
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            # 看看有没有嵌套的 questions 字段
            if "questions" in data:
                return [data]
            # 或者顶层就是一个练习题对象
            if "question" in data or "options" in data:
                return [data]
    except:
        pass

    # 尝试从 ```json ... ``` 提取
    for match in re.finditer(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL):
        try:
            data = json.loads(match.group(1))
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return [data]
        except:
            pass

    # 尝试从第一个 [ 到最后一个 ] 提取
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return [data]
        except:
            pass

    print(f"JSON 解析失败，原始输出前 500 字: {text[:500]}", file=sys.stderr)
    return None


# ========== 生成函数 ==========
def build_practice_prompt(level, category, count, existing_titles):
    """构建练习题生成提示"""
    existing_str = ", ".join(existing_titles[:50]) if existing_titles else "なし"

    # 根据题型类别选择题型说明文字
    category_instructions = {
        "漢字読み": "題型：漢字の読み方選択 — 文中の漢字の正しい読み方を4つの選択肢から選ぶ問題",
        "漢字書き": "題型：漢字書き取り選択 — 振り仮名部分の正しい漢字を4つの選択肢から選ぶ問題",
        "文法": "題型：文法填空選択 — 文中の空欄に入る最も適切な文法表現を4つの選択肢から選ぶ問題",
        "語彙": "題型：語彙選択 — 文中の単語や表現の意味・用法として最も適切なものを4つの選択肢から選ぶ問題",
        "読解": "題型：短文読解 — 150-250字程度の 짧은 文を読んで、内容理解に関する質問に4つの選択肢から答える問題",
        "表現": "題型：表現用法選択 — 日常表現や慣用表現の正しい使い方を4つの選択肢から選ぶ問題",
    }

    instruction = category_instructions.get(category, category_instructions["文法"])

    prompt = f"""你是 JLPT 日语专家教师。Generate {count} sets of JLPT {level} level practice questions.

题型类别：{category}
题型说明：{instruction}

JLPT {level} 级别的难度特征：
- 词汇量：N5≈800, N4≈1500, N3≈3000, N2≈6000, N1≈10000+
- 语法复杂度递增，N1涉及抽象表达和商务日语
- 阅读文本长度：N5≈100字, N4≈150字, N3≈200字, N2≈300字, N1≈400字+

生成要求：
1. 每个练习「套题」是一个独立的 JSON 对象，包含 title、level、type、category、body（題型说明）、questions 数组
2. 每个套题包含 4-6 道题目（question 对象）
3. 每道题的格式：
   {{
     "question": "完整的問題文（含む指示）",
     "options": ["1. 選択肢A", "2. 選択肢B", "3. 選択肢C", "4. 選択肢D"],
     "answer": "正解の番号（"1"、"2"、"3"、"4"のいずれか）"
   }}
4. 选项编号 "1." "2." "3." "4." 必须正確標註，answer 字段的值必須與正確選項的編號完全一致
5. 选项必须是干扰项合理的（错项要有迷惑性，但不可能是正确答案）
6. 不要在 JSON 中包含额外字段，严格按照上述格式
7. 不要在文本中包含 explanatory text，只输出纯 JSON 数组
8. 确保日本文化/语言背景正确，选项不要出现中国式表达

每个套题对象格式（输出为 JSON 数组，每个元素是一个套题）：
{{
  "title": "{level} {category}練習 - 第{{x}}回",
  "level": "{level}",
  "type": "practice",
  "category": "{category}",
  "body": "題型說明文字（如：次の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。）",
  "questions": [
    {{"question": "...", "options": ["1. ...","2. ...","3. ...","4. ..."], "answer": "..."}}
  ]
}}

已有套题标题（避免重复）：{existing_str}

只输出 JSON 数组，数组的每个元素是一个套题对象。不允许有解释文字。
"""
    return prompt


def generate_practice(level, category, count, existing_titles):
    """生成 JLPT 练习题"""
    prompt = build_practice_prompt(level, category, count, existing_titles)

    messages = [
        {
            "role": "system",
            "content": "你是 JLPT 日语专家教师。请务必严格按照以下要求输出：\n"
                       "1. 只输出纯 JSON 数组，不要任何解释文字\n"
                       "2. 每个套题对象包含：title, level, type, category, body, questions\n"
                       "3. 每个 question 对象包含：question, options(数组,每项以\"N.\"开头), answer(\"1\"/\"2\"/\"3\"/\"4\")\n"
                       "4. answer 的值必须是正确选项的编号，且该选项内容必须以 answer 值开头\n"
                       "5. 选项必须是干扰项合理、有区分度的\n"
                       "6. 日语表达必须地道、准确，符合 JLPT {level} 难度".format(level=level)
        },
        {"role": "user", "content": prompt},
    ]

    response = call_groq(messages, max_tokens=min(8000, MAX_TOKENS))
    return extract_json(response)


# ========== 去重与校验 ==========
def validate_question(q, idx):
    """校验单个题目是否符合格式要求"""
    errors = []
    if not isinstance(q.get("question"), str) or len(q["question"].strip()) < 10:
        errors.append(f"题目 {idx}: question 太短或缺失")
    if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
        errors.append(f"题目 {idx}: options 不是长度为4的数组")
        return errors
    for i, opt in enumerate(q["options"]):
        if not isinstance(opt, str) or not opt.startswith(f"{i+1}."):
            errors.append(f"题目 {idx}: 选项 {i+1} 格式错误（应以 '{i+1}.' 开头）: {opt[:50]}")
    ans = q.get("answer", "")
    if ans not in ["1", "2", "3", "4"]:
        errors.append(f"题目 {idx}: answer 不是 1/2/3/4: {ans}")
    else:
        # 检查 answer 对应的选项是否以 answer 开头
        expected = f"{ans}."
        if not q["options"][int(ans)-1].startswith(expected):
            errors.append(f"题目 {idx}: answer={ans} 但对应选项不以 '{expected}' 开头: {q['options'][int(ans)-1][:50]}")
    return errors


def validate_practice_set(data):
    """校验一个练习套题对象"""
    errors = []
    if not isinstance(data, dict):
        return ["不是对象"]
    for field in ["title", "level", "type", "category", "body", "questions"]:
        if field not in data:
            errors.append(f"缺少字段: {field}")
    if not isinstance(data.get("questions"), list) or len(data["questions"]) < 2:
        errors.append("questions 不是长度>=2的数组")
    for i, q in enumerate(data.get("questions", [])):
        q_errors = validate_question(q, i+1)
        errors.extend(q_errors)
    return errors


def filter_and_validate(raw_data, level, category):
    """过滤无效数据，返回有效的练习套题列表"""
    if not raw_data:
        return []

    valid = []
    for item in raw_data:
        if not isinstance(item, dict):
            continue
        # 确保字段齐全
        if "questions" not in item:
            continue
        # 设置缺失的元字段
        item.setdefault("level", level)
        item.setdefault("type", "practice")
        item.setdefault("category", category)
        if "title" not in item or not item["title"]:
            item["title"] = f"{level} {category}練習 - 第{len(valid)+1}回"
        if "body" not in item or not item["body"]:
            item["body"] = "次の問題に答えなさい。"
        # 校验题目
        errs = validate_practice_set(item)
        if errs:
            print(f"⚠ 套题校验失败 ({item.get('title','?')}): {errs[:3]}", file=sys.stderr)
            continue
        valid.append(item)

    return valid


# ========== 主入口 ==========
def main():
    parser = argparse.ArgumentParser(description="JLPT 练习题生成器")
    parser.add_argument("--level", default="N3", help="JLPT 级别: N5, N4, N3, N2, N1")
    parser.add_argument("--category", default="文法", help="题型类别: 漢字読み, 漢字書き, 文法, 語彙, 読解, 表現")
    parser.add_argument("--count", type=int, default=3, help="生成套题数量（每套4-6题）")
    parser.add_argument("--output", default=None, help="输出文件路径（默认自动生成到 practice/目录）")
    parser.add_argument("--dry-run", action="store_true", help="只生成不保存，打印结果")

    args = parser.parse_args()

    level = args.level.upper()
    category = args.category
    count = args.count

    if level not in QUESTION_CATEGORIES:
        print(f"不支持的级别: {level}，可选: {list(QUESTION_CATEGORIES.keys())}", file=sys.stderr)
        sys.exit(1)
    if category not in QUESTION_CATEGORIES.get(level, []):
        print(f"级别 {level} 不支持题型 {category}，可选: {QUESTION_CATEGORIES.get(level, [])}", file=sys.stderr)
        sys.exit(1)

    print(f"=== JLPT 练习题生成器 ===")
    print(f"级别: {level} | 题型: {category} | 数量: {count} 套题")
    print(f"Groq model: {MODEL}")

    # 加载已有的练习套题标题（去重用）
    existing_titles = []
    if PRACTICE_DIR.exists():
        for f in PRACTICE_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("title"):
                            existing_titles.append(item["title"])
                elif isinstance(data, dict) and data.get("title"):
                    existing_titles.append(data["title"])
            except:
                pass

    print(f"已有练习套题: {len(existing_titles)} 个标题")

    # 生成
    print(f"\n开始生成 {count} 套题...")
    raw = generate_practice(level, category, count, existing_titles)

    if not raw:
        print("生成失败！", file=sys.stderr)
        sys.exit(1)

    print(f"原始输出: {len(raw)} 个对象")

    # 校验和过滤
    valid = filter_and_validate(raw, level, category)
    print(f"校验通过: {len(valid)} 套题")

    if not valid:
        print("所有套题校验失败！", file=sys.stderr)
        sys.exit(1)

    # 决定输出路径
    if args.output:
        out_path = Path(args.output)
    else:
        safe_cat = re.sub(r'[^a-zA-Z0-9]', '', category)
        out_path = PRACTICE_DIR / f"practice_{level.lower()}_{safe_cat}.json"

    # 合并到已有文件（如果存在）
    merged = list(valid)
    if out_path.exists():
        try:
            existing_data = json.loads(out_path.read_text(encoding="utf-8"))
            if isinstance(existing_data, list):
                merged = existing_data + merged
                print(f"已加载已有文件 {len(existing_data)} 套题，合并后共 {len(merged)} 套题")
            else:
                merged = valid
        except:
            merged = valid

    # 去重（按 title）
    seen = set()
    deduped = []
    for item in merged:
        t = item.get("title", "")
        if t and t not in seen:
            seen.add(t)
            deduped.append(item)
        elif not t:
            deduped.append(item)

    print(f"去重后: {len(deduped)} 套题")

    # 保存
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ 已保存: {out_path}")

    # 打印预览
    print(f"\n--- 预览（第一个套题）---")
    preview = deduped[0]
    print(f"标题: {preview['title']}")
    print(f"级别: {preview['level']} | 类别: {preview['category']}")
    print(f"题型说明: {preview['body'][:80]}...")
    print(f"题目数: {len(preview['questions'])}")
    for i, q in enumerate(preview["questions"][:3]):
        print(f"  Q{i+1}: {q['question'][:60]}...")
        for opt in q["options"]:
            marker = "←正解" if opt.startswith(q["answer"]) else ""
            print(f"    {opt} {marker}")
    if len(deduped) > 1:
        print(f"\n... 还有 {len(deduped)-1} 个套题未显示")


if __name__ == "__main__":
    main()
