#!/usr/bin/env python3
"""
日语新闻爬虫 - 每日自动抓取 NHK 新闻，生成阅读理解题
数据源：NHK News RSS（description 字段直接包含正文）
"""
import json
import random
import re
import time
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ========== 配置 ==========
DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"
NEWS_DIR = DATA_DIR / "news"
NEWS_DIR.mkdir(exist_ok=True)

# NHK RSS 源（description 包含正文）
RSS_FEEDS = {
    "NHK_社会": "https://www3.nhk.or.jp/rss/news/cat0.xml",
    "NHK_政治": "https://www3.nhk.or.jp/rss/news/cat1.xml",
    "NHK_経済": "https://www3.nhk.or.jp/rss/news/cat5.xml",
    "NHK_国際": "https://www3.nhk.or.jp/rss/news/cat6.xml",
    "NHK_科学": "https://www3.nhk.or.jp/rss/news/cat7.xml",
    "NHK_スポーツ": "https://www3.nhk.or.jp/rss/news/cat8.xml",
    "NHK_文化": "https://www3.nhk.or.jp/rss/news/cat9.xml",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def fetch_rss(url: str) -> list[dict]:
    """从 RSS 获取新闻列表"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "xml")
        items = []
        for item in soup.find_all("item"):
            title = item.find("title")
            description = item.find("description")
            link = item.find("link")
            if title and description:
                items.append({
                    "title": title.text.strip(),
                    "description": description.text.strip(),
                    "url": link.text.strip() if link else "",
                })
        return items
    except Exception as e:
        print(f"RSS 获取失败 {url}: {e}")
        return []


def generate_questions(article: dict) -> list[dict]:
    """基于新闻内容生成阅读理解题"""
    content = article["description"]
    title = article["title"]

    questions = []

    # 问题1：主旨题
    questions.append({
        "question": "このニュースの内容として正しいものはどれですか。",
        "options": [
            f"「{title}」についてのニュースです。",
            f"「{title}」についての天気予報です。",
            f"「{title}」についてのスポーツニュースです。",
            f"「{title}」についての料理の話です。",
        ],
        "answer": "A",
    })

    # 问题2：细节题
    sentences = [s.strip() for s in content.split("。") if len(s.strip()) > 10]
    if len(sentences) >= 2:
        key_sentence = sentences[1] if len(sentences) > 1 else sentences[0]
        questions.append({
            "question": "ニュースの内容と合っているものはどれですか。",
            "options": [
                key_sentence[:50] + "...",
                "内容と関係ない選択肢です。",
                "別の内容についての話です。",
                "正解はありません。",
            ],
            "answer": "A",
        })

    # 问题3：词汇题
    words = re.findall(r'[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]+', content)
    long_words = [w for w in words if len(w) >= 4]
    if long_words:
        target_word = random.choice(long_words[:5])
        questions.append({
            "question": f"「{target_word}」の意味として最も近いものはどれですか。",
            "options": [
                f"「{target_word}」に関連する意味です。",
                "全く関係ない意味です。",
                "反対の意味です。",
                "同じ意味の別の言葉です。",
            ],
            "answer": "A",
        })

    return questions


def save_article(article: dict, category: str) -> bool:
    """保存新闻到 JSON 文件"""
    today = date.today().isoformat()
    news_file = NEWS_DIR / f"{today}.json"

    if news_file.exists():
        with open(news_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"date": today, "articles": []}

    # 检查是否已存在（用标题判断）
    titles = [a.get("title") for a in data["articles"]]
    if article["title"] in titles:
        return False

    article["category"] = category
    article["questions"] = generate_questions(article)
    article["level"] = "N0"

    data["articles"].append(article)

    with open(news_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return True


def main():
    print("=== NHK 新闻爬虫启动 ===\n")

    total_fetched = 0
    total_saved = 0

    for category, rss_url in RSS_FEEDS.items():
        print(f"[{category}] 获取 RSS...")
        items = fetch_rss(rss_url)
        print(f"  找到 {len(items)} 条新闻")

        # 每个分类最多取 3 条
        for item in items[:3]:
            total_fetched += 1
            print(f"  抓取: {item['title'][:40]}...")

            if item["description"]:
                if save_article(item, category):
                    total_saved += 1
                    print(f"    ✅ 保存成功")
                else:
                    print(f"    ⚠️ 已存在，跳过")
            else:
                print(f"    ❌ 内容获取失败")

            time.sleep(1)

    print(f"\n=== 完成 ===")
    print(f"抓取: {total_fetched} 条")
    print(f"保存: {total_saved} 条")

    # 显示今日新闻数量
    today = date.today().isoformat()
    news_file = NEWS_DIR / f"{today}.json"
    if news_file.exists():
        with open(news_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"今日累计: {len(data['articles'])} 条新闻")


if __name__ == "__main__":
    main()
