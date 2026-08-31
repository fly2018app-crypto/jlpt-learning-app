#!/usr/bin/env python3
"""
JLPT Daily Data Generator - 预运行和后处理脚本

预运行：生成 AI 提示（含去重列表）
后处理：解析 AI 输出并去重写入，返回剩余缺口

用法：
    python jlpt_generator.py pre       # 生成提示
    python jlpt_generator.py post      # 后处理写入，输出剩余缺口
    python jlpt_generator.py status    # 查看状态
"""
import json
import random
import sys
from datetime import date
from pathlib import Path

# ========== 配置 ==========
DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"
TOPIC_POOL_FILE = DATA_DIR / "topic_pool.yaml"
CURRENT_TOPIC_FILE = DATA_DIR / "current_topic.txt"
USED_TOPICS_FILE = DATA_DIR / "used_topics.txt"
DAILY_LOG_FILE = DATA_DIR / "daily-log.txt"

# 每次生成量（可调整倍数）
MULTIPLIER = 1  # 每次1倍量
BASE_TARGETS = {"words": 20, "grammar": 10, "scenes": 5, "topics": 3}
# 级别：N0 = 未分级/超纲, N5-N1 = 标准 JLPT 级别
SUPPORTED_LEVELS = ["N0", "N5", "N4", "N3", "N2", "N1"]
TARGETS = {k: v * MULTIPLIER for k, v in BASE_TARGETS.items()}


# ========== 工具函数 ==========
def load_yaml_simple(path):
    data = {}
    current_cat = None
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("  ") and line.strip().startswith("-"):
                if current_cat:
                    item = line.strip()[1:].strip()
                    data[current_cat].append(item)
            elif line.endswith(":"):
                current_cat = line[:-1].strip()
                data[current_cat] = []
    return data


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_used_topics():
    if USED_TOPICS_FILE.exists():
        return set(USED_TOPICS_FILE.read_text(encoding="utf-8").strip().split("\n"))
    return set()


def get_current_topic():
    if CURRENT_TOPIC_FILE.exists():
        text = CURRENT_TOPIC_FILE.read_text(encoding="utf-8").strip()
        parts = text.split("|")
        if len(parts) >= 3:
            return {"category": parts[0], "topic": parts[1], "date": parts[2]}
    return None


def select_new_topic():
    pool = load_yaml_simple(TOPIC_POOL_FILE)
    used = get_used_topics()
    available = []
    for cat, topics in pool.items():
        for t in topics:
            key = f"{cat}/{t}"
            if key not in used:
                available.append({"category": cat, "topic": t, "key": key})
    if not available:
        used = set()
        USED_TOPICS_FILE.write_text("", encoding="utf-8")
        for cat, topics in pool.items():
            for t in topics:
                available.append({"category": cat, "topic": t, "key": f"{cat}/{t}"})
    return random.choice(available)


def get_all_existing_keywords():
    keywords = {"words": [], "grammar": [], "scenes": [], "topics": []}
    words = load_json(DATA_DIR / "words.json")
    for w in words:
        keywords["words"].append(w["word"])
        keywords["words"].append(w["reading"])
    grammar = load_json(DATA_DIR / "grammar.json")
    for g in grammar:
        keywords["grammar"].append(g["title"])
    scenes = load_json(DATA_DIR / "scenes.json")
    for s in scenes:
        keywords["scenes"].append(s["title"])
    topics = load_json(DATA_DIR / "topics.json")
    for t in topics:
        keywords["topics"].append(t["title"])
    return keywords


# ========== 预运行 ==========
def run_pre():
    today = date.today().isoformat()
    current = get_current_topic()
    if current is None or current["date"] != today:
        chosen = select_new_topic()
        CURRENT_TOPIC_FILE.write_text(
            f"{chosen['category']}|{chosen['topic']}|{today}", encoding="utf-8"
        )
        used = get_used_topics()
        used.add(chosen["key"])
        USED_TOPICS_FILE.write_text("\n".join(sorted(used)), encoding="utf-8")
        topic = chosen["topic"]
        category = chosen["category"]
    else:
        topic = current["topic"]
        category = current["category"]

    existing = get_all_existing_keywords()
    output = {
        "topic": topic,
        "category": category,
        "date": today,
        "targets": TARGETS,
        "existing_keywords": existing,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


# ========== 后处理 ==========
def run_post():
    existing_keywords = get_all_existing_keywords()
    stats = {"words": 0, "grammar": 0, "scenes": 0, "topics": 0, "duplicates": 0}
    remaining = {"words": 0, "grammar": 0, "scenes": 0, "topics": 0}

    for fname, key in [
        ("words.json", "words"),
        ("grammar.json", "grammar"),
        ("scenes.json", "scenes"),
        ("topics.json", "topics"),
    ]:
        filepath = DATA_DIR / fname
        data = load_json(filepath)
        existing_ids = {item["id"] for item in data}
        current_max = max(existing_ids) if existing_ids else 0

        new_file = DATA_DIR / f"new_{fname}"
        if new_file.exists():
            new_items = load_json(new_file)
            added = 0
            for item in new_items:
                dup_key = None
                if key == "words":
                    dup_key = item.get("word", "")
                elif key == "grammar":
                    dup_key = item.get("title", "")
                elif key == "scenes":
                    dup_key = item.get("title", "")
                elif key == "topics":
                    dup_key = item.get("title", "")

                if dup_key and dup_key in existing_keywords[key]:
                    stats["duplicates"] += 1
                    continue

                current_max += 1
                item["id"] = current_max
                data.append(item)
                added += 1
                stats[key] += 1

            save_json(filepath, data)
            new_file.unlink()

            # 检查是否达到目标
            if added < TARGETS[key]:
                remaining[key] = TARGETS[key] - added
        else:
            remaining[key] = TARGETS[key]

    # 写入日志
    today = date.today().isoformat()
    total_added = stats["words"] + stats["grammar"] + stats["scenes"] + stats["topics"]
    log_entry = f"[{today}] 新增: 词+{stats['words']} 语法+{stats['grammar']} 场景+{stats['scenes']} 主题+{stats['topics']} 去重丢弃:{stats['duplicates']}\n"
    with open(DAILY_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_entry)

    # 输出结果（含剩余缺口）
    output = {
        "added": stats,
        "duplicates_removed": stats["duplicates"],
        "remaining_needed": remaining,
        "is_complete": all(v == 0 for v in remaining.values()),
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


# ========== 状态查看 ==========
def run_status():
    current = get_current_topic()
    used = get_used_topics()
    pool = load_yaml_simple(TOPIC_POOL_FILE)
    total = sum(len(v) for v in pool.values())

    print(f"今日主题: {current['topic'] if current else '无'}")
    print(f"已用主题: {len(used)}/{total}")
    print(f"各文件条目数:")
    for fname in ["words.json", "grammar.json", "scenes.json", "topics.json"]:
        data = load_json(DATA_DIR / fname)
        print(f"  {fname}: {len(data)}")


# ========== 主入口 ==========
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python jlpt_generator.py [pre|post|status]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "pre":
        run_pre()
    elif cmd == "post":
        run_post()
    elif cmd == "status":
        run_status()
    else:
        print(f"未知命令: {cmd}")
        sys.exit(1)
