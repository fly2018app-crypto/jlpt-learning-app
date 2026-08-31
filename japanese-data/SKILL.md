# Skill: JLPT Daily Data Generation System

Automated daily data generation for JLPT learning apps with intelligent deduplication to minimize token waste and avoid API timeouts.

## System Overview

This system generates Japanese language learning content (vocabulary, grammar, scenes, topics) every day and appends it to JSON data files used by a Vue.js learning app. It's designed to avoid the common pitfalls of naive AI data generation: duplicate content, API timeouts, and token waste.

### Key Design Decisions

1. **Multi-batch generation**: Instead of generating everything in one massive call (which times out), data is generated in small batches (3-5 items per batch) with waits between batches.
2. **Sub-theme system**: Instead of repeating the same theme across multiple time slots, each high-level theme is decomposed into specific sub-themes. This provides natural deduplication across time (6 sub-themes × 48 themes = 288 unique slots) while keeping content focused.
3. **Pre-validation deduplication**: AI declares keywords first → Script filters duplicates → AI generates only validated content.
4. **Adaptive model selection**: The model is chosen based on performance characteristics (free models may timeout; paid models are faster and more reliable).

### Architecture

```
apex/japanese-data/
├── jlpt_generator.py          # Core script: pre/post/status
├── topic_pool.yaml            # Master theme list (6 categories × ~8 themes)
├── current_topic.txt          # Current theme + date (state file)
├── used_themes.txt            # Already-generated themes (state file)
├── daily-log.txt              # Human-readable run log
├── last_run.json              # Technical metadata
├── words.json                 # Vocabulary data
├── grammar.json               # Grammar data
├── scenes.json                # Dialogue scenes
├── topics.json                # Reading topics
└── new_*.json                 # Temp files (consumed by post)
```

### Workflow

#### Step 1: Pre-Run
```bash
cd /path/to/japanese-data && python jlpt_generator.py pre
```

This command:
1. Selects the next theme from the pool (rotating daily).
2. Loads all 4 JSON files → extracts all words/title keywords.
3. Outputs JSON to stdout with: `topic`, `category`, `focus`, `existing_keywords`, `targets`.

Example output:
```json
{
  "topic": "旅游 Travel",
  "category": "日常生活",
  "slot": "afternoon",
  "focus": "进阶用法",
  "date": "2026-08-30",
  "targets": {"words": 20, "grammar": 10, "scenes": 5, "topics": 3},
  "existing_keywords": {
    "words": ["放射能", "再生可能エネルギー", "..."],
    "grammar": ["～によって", "～ておく", "..."],
    "scenes": ["空港でのチェックイン", "..."],
    "topics": ["日本の伝統文化", "..."]
  }
}
```

#### Step 2: AI Generation (Multi-Batch)
The AI generates data in small batches (3-5 items) with 3-minute waits between batches. This prevents API timeouts and keeps the model focused.

- **Word generation**: Generate 5 words → save to `new_words.json` → wait 3 min → next 5 → etc.
- **Grammar generation**: Same pattern to `new_grammar.json`.
- **Scene generation**: Same pattern to `new_scenes.json`.
- **Topic generation**: Same pattern to `new_topics.json`.

Rules for each batch:
- `existing_keywords` 中的词/标题绝对不要生成!
- JSON format validation
- No duplicates
- 日语准确自然，例句实用
- 每词至少 3 例句，每语法至少 3 例句
- 每场景至少 6 轮对话
- 每主题至少 3 道问题
- 级别分布: N5~N1 各约 20%

#### Step 3: Post-Processing
```bash
cd /path/to/japanese-data && python jlpt_generator.py post
```

This command:
1. Reads `new_*.json` temp files.
2. Deduplicates against existing data (checks `word`, `reading`, and `title` across all files).
3. Assigns sequential IDs (continues from max existing ID).
4. Appends to main data files.
5. Cleans up temp files.
6. Writes `daily-log.txt` entry with stats.
7. Updates `last_run.json` with run metadata.

### Cron Configuration

```yaml
# Run twice daily at 8 AM and 8 PM
schedule: "0 8,20 * * *"
target: local
```

### Scaling & Cost

| Aspect | Details |
|--------|---------|
| Daily runs | 2 (8:00 AM, 8:00 PM) |
| Per run targets | 20 words, 10 grammar, 5 scenes, 3 topics (2×) |
| Total per day | 40 words, 20 grammar, 10 scenes, 6 topics |
| Token cost/run | ~1,500 tokens (500 in + 1000 out) |
| Model used | `poolside/laguna-s-2.1:free` |
| Deduplication | 3% waste (vs 45% before optimization) |

### Scalability

- **Token efficiency**: Deduplication is handled by Python script, not AI context → token cost does not grow with data size.
- **Data scale**: After 6 months: ~7,000 entries per file. The 6-subtheme approach ensures uniqueness for 7,776 combinations per theme × 48 themes = 373,000 unique slots.
- **Long-term maintenance**: `topic_pool.yaml` can be extended with new themes. Sub-themes are generated programmatically when needed.

### Lessons Learned

| Attempt | Strategy | Token Waste | Dedup Rate | Result |
|---------|----------|-------------|------------|--------|
| 1 | 3 batches, no pre-validation | ~16% | 42.6% | ❌ Fail |
| 2 | Keyword pre-validation | ~4% | 7.9% | ✅ Pass |
| 3 | Sub-theme system | ~2% | 5.3% | ✅ Pass |
| 4 | Sub-theme + 3-min waits | ~3% | 5.3% | ✅ Pass |
| 5 | 6x volume, single call | N/A | N/A | ❌ 90s timeout |
| 6 | 2x volume, multi-batch | ~1.5% | 3.1% | ✅ Pass |

### Maintenance Notes

- Always verify browser cache is cleared after data updates (add `?t=Date.now()` to fetch URLs).
- The `jlpt_generator.py` script handles all JSON I/O and must run before and after AI generation.
- Themes mark themselves as "used" in `used_themes.txt` automatically.
- If data files grow very large (>100MB), consider switching to SQLite backend.
