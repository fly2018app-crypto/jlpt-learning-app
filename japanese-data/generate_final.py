#!/usr/bin/env python3
"""Generate remaining data: 2 grammar + 2 scenes"""
import json
from pathlib import Path

DATA_DIR = Path.home() / "OneDrive" / "ドキュメント" / "apex" / "japanese-data"

grammar = [
    {"title": "～てたまらない", "meaning": "can't help but~, extremely~, unbearably~", "level": "N2", "isImportant": False, "expressions": ["～てたまらない", "～てたまらないほど"], "patterns": ["Verb/Adj + てたまらない"], "examples": [{"jp": "不安でたまらない。", "en": "I can't help but feel anxious."}, {"jp": "心配でたまらない。", "en": "I'm unbearably worried."}], "notes": "Expresses strong feeling."},
    {"title": "～てならない", "meaning": "can't help but~, extremely~", "level": "N2", "isImportant": False, "expressions": ["～てならない", "～てならないほど"], "patterns": ["Verb/Adj + てならない"], "examples": [{"jp": "不安でならない。", "en": "I can't help but feel anxious."}, {"jp": "心配でならない。", "en": "I'm extremely worried."}], "notes": "Expresses strong feeling, more formal than たまらない."},
]

scenes = [
    {"title": "市役所で届け出る", "level": "N3", "isImportant": False, "dialogues": [{"speaker": "学生", "jp": "転入届を出したいんですが。", "en": "I want to submit a moving-in notification."}, {"speaker": "係員", "jp": "パスポートと在留カードをお願いします。", "en": "Please give me your passport and residence card."}, {"speaker": "学生", "jp": "はい、どうぞ。", "en": "Here you go."}, {"speaker": "係員", "jp": "こちらに住所を記入してください。", "en": "Please fill in your address here."}, {"speaker": "学生", "jp": "これでいいですか？", "en": "Is this okay?"}, {"speaker": "係員", "jp": "はい、完了です。", "en": "Yes, it's complete."}]},
    {"title": "図書館で本を借りる", "level": "N3", "isImportant": False, "dialogues": [{"speaker": "学生", "jp": "本を借りたいんですが。", "en": "I want to borrow a book."}, {"speaker": "司書", "jp": "図書館カードはありますか？", "en": "Do you have a library card?"}, {"speaker": "学生", "jp": "いいえ、まだです。", "en": "No, not yet."}, {"speaker": "司書", "jp": "では、作りましょう。学生証はありますか？", "en": "Then let's make one. Do you have a student ID?"}, {"speaker": "学生", "jp": "はい、あります。", "en": "Yes, I do."}, {"speaker": "司書", "jp": "これは貸出カードです。返却期限は2週間です。", "en": "This is the lending card. The return period is 2 weeks."}]},
]

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

write_json(DATA_DIR / "new_grammar.json", grammar)
write_json(DATA_DIR / "new_scenes.json", scenes)

print(f"Generated: {len(grammar)} grammar, {len(scenes)} scenes")
