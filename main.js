const { createApp, reactive } = Vue;

// ========== Global Error Handler ==========
window.addEventListener('error', (e) => {
  console.error('[App Error]', e.message, e.filename, e.lineno);
});

// ========== Favorites Store (Reactive) ==========
const favoritesStore = reactive({
  data: {},
  version: 0,
  refresh() {
    this.data = getFavorites();
    this.version++;
  }
});

// ========== User Level Store (Reactive) ==========
const userLevelStore = reactive({
  level: localStorage.getItem('jlptLevel') || 'N2',
  setLevel(newLevel) {
    this.level = newLevel;
    localStorage.setItem('jlptLevel', newLevel);
  }
});

function getSavedLevel() {
  return localStorage.getItem('jlptLevel') || 'N2';
}

function getFavorites() {
  try {
    const data = localStorage.getItem('favorites');
    if (!data) return {};
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const migrated = { words: parsed };
      localStorage.setItem('favorites', JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch (e) {
    return {};
  }
}

function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function getCategoryFavorites(category) {
  void favoritesStore.version; // track reactivity
  const favs = getFavorites();
  return favs[category] || [];
}

function isFavorite(category, id) {
  return getCategoryFavorites(category).some(f => f.id == id);
}

function toggleFavorite(category, item) {
  const favs = getFavorites();
  if (!favs[category]) favs[category] = [];
  const idx = favs[category].findIndex(f => f.id == item.id);
  if (idx > -1) {
    favs[category].splice(idx, 1);
  } else {
    favs[category].push({ ...item });
  }
  saveFavorites(favs);
  favoritesStore.refresh();
  return idx === -1;
}

// ========== Completed Store ==========
const completedStore = reactive({
  data: loadCompleted(),
  version: 0,
  refresh() {
    this.data = loadCompleted();
    this.version++;
  }
});

function loadCompleted() {
  try {
    const data = localStorage.getItem('completed');
    if (!data) return {};
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function saveCompleted(data) {
  localStorage.setItem('completed', JSON.stringify(data));
}

function isCompleted(category, id) {
  void completedStore.version;
  return (completedStore.data[category] || []).some(c => c.id == id);
}

function toggleCompleted(category, item) {
  const completed = loadCompleted();
  if (!completed[category]) completed[category] = [];
  const idx = completed[category].findIndex(c => c.id == item.id);
  if (idx > -1) {
    completed[category].splice(idx, 1);
  } else {
    completed[category].push({ id: item.id, completedAt: Date.now() });
  }
  saveCompleted(completed);
  completedStore.data = completed;
  completedStore.version++;
}

window.isCompleted = isCompleted;
window.toggleCompleted = toggleCompleted;

// ========== Practice History Store (学習履歴) ==========
const practiceHistoryStore = reactive({
  data: loadPracticeHistory(),
  version: 0,
  refresh() {
    this.data = loadPracticeHistory();
    this.version++;
  }
});

function loadPracticeHistory() {
  try {
    const data = localStorage.getItem('practiceHistory');
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // 現場舊數據可能缺字段，補全後再返回，避免渲染時訪問 undefined
    return parsed.map(item => ({
      title: item.title || '未命名练习',
      category: item.category || '',
      level: item.level || '',
      correct: Number(item.correct) || 0,
      wrong: Number(item.wrong) || 0,
      accuracy: Number(item.accuracy) || 0,
      totalQuestions: Number(item.totalQuestions) || 0,
      startTime: Number(item.startTime) || Date.now(),
      elapsedSeconds: Number(item.elapsedSeconds) || 0,
      completedAt: Number(item.completedAt) || Date.now()
    }));
  } catch (e) {
    return [];
  }
}

function savePracticeHistory(entries) {
  localStorage.setItem('practiceHistory', JSON.stringify(entries));
}

function addPracticeRecord(record) {
  const history = loadPracticeHistory();
  // 确保记录有必要的字段，避免现场旧数据缺字段导致渲染报错
  const safe = {
    ...record,
    title: record.title || '未命名练习',
    category: record.category || '',
    level: record.level || '',
    correct: Number(record.correct) || 0,
    wrong: Number(record.wrong) || 0,
    accuracy: Number(record.accuracy) || 0,
    totalQuestions: Number(record.totalQuestions) || 0,
    startTime: Number(record.startTime) || Date.now(),
    elapsedSeconds: Number(record.elapsedSeconds) || 0,
    completedAt: Number(record.completedAt) || Date.now()
  };
  history.unshift(safe);
  // 最多保留 200 条
  if (history.length > 200) history.length = 200;
  savePracticeHistory(history);
  practiceHistoryStore.data = history;
  practiceHistoryStore.version++;
}

// ========== Language Store ==========
const languageStore = reactive({
  language: localStorage.getItem('userLanguage') || 'zh',
  version: 0,
  setLanguage(lang) {
    this.language = lang;
    localStorage.setItem('userLanguage', lang);
    this.version++;
  }
});

function t(zh, en) {
  void languageStore.version;
  return languageStore.language === 'en' ? en : zh;
}

// Make t available globally for templates
// (will be set after app is created)

// Expose global helpers to all components
// (will be set after app is created)

// Add t as a mixin for all components (reactive)
// (will be set after app is created)

// ========== Components ==========

const Home = {
  data() { return { version: '0.0' }; },
  mounted() {
    fetch('/version.json?t=' + Date.now())
      .then(r => r.json())
      .then(json => { this.version = json.latest_version || '0.0'; })
      .catch(() => { this.version = '0.0'; });
  },
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <h1 class="text-4xl font-bold text-indigo-800 mb-8">JLPT Learning App</h1>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <button @click="$emit('navigate', '/words')" class="py-4 px-6 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700">📝 単語一覧 (Words List)</button>
        <button @click="$emit('navigate', '/grammar')" class="py-4 px-6 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">📖 文法一覧 (Grammar List)</button>
        <button @click="$emit('navigate', '/scenes')" class="py-4 px-6 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700">💬 シーン対話 (Scene Dialogues)</button>
        <button @click="$emit('navigate', '/topics')" class="py-4 px-6 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600">📚 読解 (Topic Reading)</button>
        <button @click="$emit('navigate', '/favorites')" class="py-4 px-6 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600">⭐ 收藏一覧 (Favorites)</button>
        <button @click="$emit('navigate', '/settings')" class="py-4 px-6 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600">⚙️ 設定 (Settings)</button>
        <button @click="$emit('navigate', '/practice')" class="py-4 px-6 bg-pink-600 text-white rounded-lg shadow-md hover:bg-pink-700">📝 練習題 (Practice)</button>
        <button @click="$emit('navigate', '/version-history')" class="py-4 px-6 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700">📋 版本歷史 (Version)</button>
      </div>
      <div class="absolute bottom-2 right-4 text-xs text-gray-400">v{{ version }}</div>
    </div>
  `
};

// ----- Words -----

const Words = {
  data() { return { words: [], isLoading: true, showAll: false, currentPage: 1 }; },
  mounted() {
    const level = this.getSavedLevel();
    const lv = level.toLowerCase();
    const fetches = [];
    for (let i = 1; i <= 10; i++) {
      fetches.push(fetch(`/japanese-data/words_${lv}_${i}.json?t=${Date.now()}`).then(r => r.json()));
    }
    Promise.all(fetches)
      .then(chunks => { this.words = [].concat(...chunks); this.isLoading = false; })
      .catch(() => { this.isLoading = false; });
  },
  watch: {
    currentPage() {
      this.$nextTick(() => {
        const el = document.querySelector('.list-scroll-top');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredWords() {
      void completedStore.version;
      let result = this.words;
      if (!this.showAll) {
        result = result.filter(w => !isCompleted('words', w.id));
      }
      return result.sort((a, b) => b.id - a.id);
    },
    totalPages() {
      return Math.ceil(this.filteredWords.length / 30);
    },
    pagedWords() {
      const start = (this.currentPage - 1) * 30;
      return this.filteredWords.slice(start, start + 30);
    }
  },
  methods: {
    goToDetail(word) { this.$emit('navigate', '/word/' + word.id); },
    isFav(word) { return isFavorite('words', word.id); },
    toggleFav(word) {
      toggleFavorite('words', { id: word.id, word: word.word, reading: word.reading, meaning: word.meaning, level: word.level });
    },
    isWordCompleted(id) { return isCompleted('words', id); },
    toggleWordCompleted(word) { toggleCompleted('words', word); },
    t(zh, en) { return languageStore.language === 'en' ? en : zh; },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">{{ t('単語一覧 (Words List)', 'Word List') }}</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="showAll = !showAll" class="px-3 py-2 text-sm rounded transition" :class="showAll ? 'bg-indigo-100 border-indigo-400 text-indigo-700 border' : 'bg-gray-200 border border-gray-300 text-gray-700 hover:bg-indigo-50'">
              {{ showAll ? t('📋 全量表示中', '📋 Showing All') : t('📋 全量表示', '📋 Show All') }}
            </button>
            <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else class="space-y-2">
          <div v-for="(word, idx) in pagedWords" :key="word.id" @click="goToDetail(word)" :class="idx === 0 ? 'list-scroll-top' : ''" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
            <div class="flex-1">
              <span class="text-lg font-bold">{{ word.word }}</span>
              <span class="text-gray-500 ml-3">{{ word.reading }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button @click.stop="toggleWordCompleted(word)" class="px-3 py-1 text-sm rounded transition" :class="isWordCompleted(word.id) ? 'bg-green-100 border-green-400 text-green-700 border' : 'border border-gray-300 text-gray-500 hover:bg-green-50'">
                {{ isWordCompleted(word.id) ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
              </button>
              <button @click.stop="toggleFav(word)" class="px-3 py-1 text-sm rounded transition" :class="isFav(word) ? 'bg-yellow-100 border-yellow-400 text-yellow-700 border' : 'border border-gray-300 text-gray-500 hover:bg-yellow-50'">
                {{ isFav(word) ? t('★ 收藏中', '★ Favorited') : t('☆ 收藏', '☆ Favorite') }}
              </button>
            </div>
          </div>
          <div v-if="filteredWords.length === 0" class="text-center py-10 text-gray-500">{{ t('該当する単語がありません', 'No matching words') }}</div>
        </div>
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-4 mb-4">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&laquo;</button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&lsaquo;</button>
          <span class="px-3 py-1 text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&rsaquo;</button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&raquo;</button>
        </div>
      </div></div>
    </div>
  `
};

const WordDetail = {
  data() { return { word: null, isLoading: true, levelWords: [], currentLevel: '' }; },
  mounted() {
    this.currentLevel = this.getSavedLevel();
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[2];
    if (id) {
      const lv = this.currentLevel.toLowerCase();
      const fetches = [];
      for (let i = 1; i <= 10; i++) {
        fetches.push(fetch(`/japanese-data/words_${lv}_${i}.json?t=${Date.now()}`).then(r => r.json()));
      }
      Promise.all(fetches)
        .then(chunks => {
          this.levelWords = [].concat(...chunks);
          this.word = this.levelWords.find(w => w.id == Number(id) || w.id == id);
          this.isLoading = false;
        })
        .catch(() => { this.isLoading = false; });
    } else {
      this.isLoading = false;
    }
  },
  computed: {
    currentIndex() {
      if (!this.word) return -1;
      return this.levelWords.findIndex(w => w.id === this.word.id);
    },
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.levelWords.length - 1;
    },
    hasPrev() {
      return this.currentIndex > 0;
    },
    nextWord() {
      if (!this.hasNext) return null;
      return this.levelWords[this.currentIndex + 1];
    },
    prevWord() {
      if (!this.hasPrev) return null;
      return this.levelWords[this.currentIndex - 1];
    }
  },
  methods: {
    isFav() { return this.word ? isFavorite('words', this.word.id) : false; },
    isWordCompleted() { return this.word ? isCompleted('words', this.word.id) : false; },
    toggleFav() {
      if (this.word) {
        const isNowFav = toggleFavorite('words', { id: this.word.id, word: this.word.word, reading: this.word.reading, meaning: this.word.meaning, level: this.word.level });
        if (!isNowFav) { this.$emit('navigate', '/words'); return; }
      }
    },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    goToNext() {
      if (this.nextWord) {
        this.$emit('navigate', '/word/' + this.nextWord.id);
      }
    },
    goToPrev() {
      if (this.prevWord) {
        this.$emit('navigate', '/word/' + this.prevWord.id);
      }
    },
    toggleWordCompleted() {
      if (this.word) toggleCompleted('words', this.word);
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('単語詳細', 'Word Detail') }}</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/words')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">{{ t('← 一覧に戻る', '← Back to List') }}</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('← 前へ', '← Prev') }}</button>
            <button @click="goToPrev" :disabled="!hasPrev" :class="hasPrev ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-2xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else-if="word" class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="text-3xl font-bold text-indigo-900">{{ word.word }}</h2>
              <p class="text-lg text-gray-600 italic mt-1">{{ word.reading }}</p>
            </div>
            <span class="px-3 py-1 text-sm rounded-full" :class="levelBadge(word.level)">{{ word.level }}</span>
          </div>
          <div class="border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">{{ t('意味 (Meaning)', 'Meaning') }}</h3>
            <p class="text-lg text-gray-800">{{ word.meaning }}</p>
          </div>
          <div class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">{{ t('例文 (Examples)', 'Examples') }}</h3>
            <div class="space-y-3">
              <div v-for="(ex, idx) in word.examples" :key="idx" class="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-400">
                <p class="text-gray-800 font-medium">{{ ex.jp }}</p>
                <p class="text-gray-600 text-sm mt-1">{{ ex.en }}</p>
              </div>
            </div>
          </div>
          <div class="border-t pt-4 mt-4 flex gap-2">
            <button @click="toggleFav" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isFav() ? 'bg-yellow-100 border border-yellow-400 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'">
              {{ isFav() ? t('★ 收藏中（タップで解除）', '★ Favorited (tap to remove)') : t('☆ 收藏に追加', '☆ Add to Favorites') }}
            </button>
          </div>
        </div>
        <div v-else class="text-center py-10 text-red-500">{{ t('単語が見つかりませんでした', 'Word not found') }}</div>
      </div></div>
    </div>
  `
};

// ----- Grammar -----

const Grammar = {
  data() { return { grammar: [], isLoading: true, showAll: false, currentPage: 1 }; },
  mounted() {
    fetch('/japanese-data/grammar.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.grammar = data; this.isLoading = false; });
  },
  watch: {
    currentPage() {
      this.$nextTick(() => {
        const el = document.querySelector('.list-scroll-top');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredGrammar() {
      let result = this.grammar.filter(g => g.level === this.currentLevel);
      if (!this.showAll) {
        result = result.filter(g => !isCompleted('grammar', g.id));
      }
      return result.sort((a, b) => b.id - a.id);
    },
    totalPages() {
      return Math.ceil(this.filteredGrammar.length / 30);
    },
    pagedGrammar() {
      const start = (this.currentPage - 1) * 30;
      return this.filteredGrammar.slice(start, start + 30);
    }
  },
  methods: {
    goToDetail(g) { this.$emit('navigate', '/grammar/' + g.id); },
    isFav(g) { return isFavorite('grammar', g.id); },
    toggleFav(g) {
      toggleFavorite('grammar', { id: g.id, title: g.title, meaning: g.meaning, level: g.level });
    },
    isGrammarCompleted(id) { return isCompleted('grammar', id); },
    toggleGrammarCompleted(g) { toggleCompleted('grammar', g); },
    t(zh, en) { return languageStore.language === 'en' ? en : zh; },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">{{ t('文法一覧 (Grammar List)', 'Grammar List') }}</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="showAll = !showAll" class="px-3 py-2 text-sm rounded transition" :class="showAll ? 'bg-green-100 border-green-400 text-green-700 border' : 'bg-gray-200 border border-gray-300 text-gray-700 hover:bg-green-50'">
              {{ showAll ? t('📋 全量表示中', '📋 Showing All') : t('📋 全量表示', '📋 Show All') }}
            </button>
            <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else class="space-y-2">
          <div v-for="(g, idx) in pagedGrammar" :key="g.id" @click="goToDetail(g)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between" :class="idx === 0 ? 'list-scroll-top' : ''">
            <div class="flex-1">
              <span class="text-lg font-bold">{{ g.title }}</span>
              <span class="text-gray-500 ml-3">{{ g.meaning }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button @click.stop="toggleGrammarCompleted(g)" class="px-3 py-1 text-sm rounded transition" :class="isGrammarCompleted(g.id) ? 'bg-green-100 border-green-400 text-green-700 border' : 'border border-gray-300 text-gray-500 hover:bg-green-50'">
                {{ isGrammarCompleted(g.id) ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
              </button>
              <button @click.stop="toggleFav(g)" class="px-3 py-1 text-sm rounded transition" :class="isFav(g) ? 'bg-yellow-100 border-yellow-400 text-yellow-700 border' : 'border border-gray-300 text-gray-500 hover:bg-yellow-50'">
                {{ isFav(g) ? t('★ 收藏中', '★ Favorited') : t('☆ 收藏', '☆ Favorite') }}
              </button>
            </div>
          </div>
          <div v-if="filteredGrammar.length === 0" class="text-center py-10 text-gray-500">{{ t('該当する文法がありません', 'No matching grammar') }}</div>
        </div>
      </div></div>
    </div>
  
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-4 mb-4">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&laquo;</button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&lsaquo;</button>
          <span class="px-3 py-1 text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&rsaquo;</button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&raquo;</button>
        </div>`
};

const GrammarDetail = {
  data() { return { grammar: null, isLoading: true, allGrammar: [] }; },
  mounted() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[2];
    if (id) {
      fetch('/japanese-data/grammar.json?t=' + Date.now())
        .then(r => r.json())
        .then(data => {
          this.allGrammar = data;
          this.grammar = data.find(g => g.id == Number(id) || g.id == id);
          this.isLoading = false;
        });
    } else {
      this.isLoading = false;
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredGrammar() {
      return this.allGrammar.filter(g => g.level === this.currentLevel);
    },
    currentIndex() {
      if (!this.grammar) return -1;
      return this.filteredGrammar.findIndex(g => g.id === this.grammar.id);
    },
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.filteredGrammar.length - 1;
    },
    hasPrev() {
      return this.currentIndex > 0;
    },
    nextGrammar() {
      if (!this.hasNext) return null;
      return this.filteredGrammar[this.currentIndex + 1];
    },
    prevGrammar() {
      if (!this.hasPrev) return null;
      return this.filteredGrammar[this.currentIndex - 1];
    }
  },
  methods: {
    isFav() { return this.grammar ? isFavorite('grammar', this.grammar.id) : false; },
    toggleFav() {
      if (this.grammar) {
        const isNowFav = toggleFavorite('grammar', { id: this.grammar.id, title: this.grammar.title, meaning: this.grammar.meaning, level: this.grammar.level });
        if (!isNowFav) { this.$emit('navigate', '/grammar'); return; }
        }
    },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    goToNext() {
      if (this.nextGrammar) {
        this.$emit('navigate', '/grammar/' + this.nextGrammar.id);
      }
    },
    goToPrev() {
      if (this.prevGrammar) {
        this.$emit('navigate', '/grammar/' + this.prevGrammar.id);
      }
    },
    toggleGrammarCompleted() {
      if (this.grammar) toggleCompleted('grammar', this.grammar);
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('文法詳細', 'Grammar Detail') }}</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/grammar')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">{{ t('← 一覧に戻る', '← Back to List') }}</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('← 前へ', '← Prev') }}</button>
            <button @click="goToPrev" :disabled="!hasPrev" :class="hasPrev ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-2xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else-if="grammar" class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-3xl font-bold text-green-900">{{ grammar.title }}</h2>
            <span class="px-3 py-1 text-sm rounded-full" :class="levelBadge(grammar.level)">{{ grammar.level }}</span>
          </div>
          <div class="border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">{{ t('意味 (Meaning)', 'Meaning') }}</h3>
            <p class="text-lg text-gray-800">{{ grammar.meaning }}</p>
          </div>
          <div class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">{{ t('説明 (Explanation)', 'Explanation') }}</h3>
            <p class="text-gray-700">{{ grammar.explanation }}</p>
          </div>
          <div v-if="grammar.patterns && grammar.patterns.length" class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">{{ t('パターン (Patterns)', 'Patterns') }}</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="(p, idx) in grammar.patterns" :key="idx" class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm border border-green-200">{{ p }}</span>
            </div>
          </div>
          <div class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">{{ t('例文 (Examples)', 'Examples') }}</h3>
            <div class="space-y-3">
              <div v-for="(ex, idx) in grammar.examples" :key="idx" class="bg-gray-50 p-4 rounded-lg border-l-4 border-green-400">
                <p class="text-gray-800 font-medium">{{ ex.jp }}</p>
                <p class="text-gray-600 text-sm mt-1">{{ ex.en }}</p>
              </div>
            </div>
          </div>
          <div v-if="grammar.notes" class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">{{ t('注意 (Notes)', 'Notes') }}</h3>
            <p class="text-gray-600 italic">{{ grammar.notes }}</p>
          </div>
          <div class="border-t pt-4 mt-4 flex gap-2">
            <button @click="toggleFav" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isFav() ? 'bg-yellow-100 border border-yellow-400 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'">
              {{ isFav() ? t('★ 收藏中（タップで解除）', '★ Favorited (tap to remove)') : t('☆ 收藏に追加', '☆ Add to Favorites') }}
            </button>
            <button @click="toggleGrammarCompleted" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isCompleted('grammar', grammar.id) ? 'bg-green-100 border border-green-400 text-green-700 hover:bg-green-200' : 'bg-green-400 hover:bg-green-500 text-green-900'">
              {{ isCompleted('grammar', grammar.id) ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
            </button>
          </div>
        </div>
        <div v-else class="text-center py-10 text-red-500">{{ t('文法が見つかりませんでした', 'Grammar not found') }}</div>
      </div></div>
    </div>
  `
};

// ----- Scenes -----

const Scenes = {
  data() { return { scenes: [], isLoading: true, showAll: false, currentPage: 1 }; },
  mounted() {
    fetch('/japanese-data/scenes.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.scenes = data; this.isLoading = false; });
  },
  watch: {
    currentPage() {
      this.$nextTick(() => {
        const el = document.querySelector('.list-scroll-top');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredScenes() {
      let result = this.scenes.filter(s => s.level === this.currentLevel);
      if (!this.showAll) {
        result = result.filter(s => !isCompleted('scenes', s.id));
      }
      return result.sort((a, b) => b.id - a.id);
    },
    totalPages() {
      return Math.ceil(this.filteredScenes.length / 30);
    },
    pagedScenes() {
      const start = (this.currentPage - 1) * 30;
      return this.filteredScenes.slice(start, start + 30);
    }
  },
  methods: {
    goToDetail(s) { this.$emit('navigate', '/scene/' + s.id); },
    isFav(s) { return isFavorite('scenes', s.id); },
    toggleFav(s) {
      toggleFavorite('scenes', { id: s.id, title: s.title, level: s.level });
    },
    isSceneCompleted(id) { return isCompleted('scenes', id); },
    toggleSceneCompleted(s) { toggleCompleted('scenes', s); },
    t(zh, en) { return languageStore.language === 'en' ? en : zh; },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">{{ t('シーン対話 (Scene Dialogues)', 'Scene Dialogues') }}</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="showAll = !showAll" class="px-3 py-2 text-sm rounded transition" :class="showAll ? 'bg-purple-100 border-purple-400 text-purple-700 border' : 'bg-gray-200 border border-gray-300 text-gray-700 hover:bg-purple-50'">
              {{ showAll ? t('📋 全量表示中', '📋 Showing All') : t('📋 全量表示', '📋 Show All') }}
            </button>
            <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else class="space-y-2">
          <div v-for="(s, idx) in pagedScenes" :key="s.id" @click="goToDetail(s)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between" :class="idx === 0 ? 'list-scroll-top' : ''">
            <div class="flex-1">
              <span class="text-lg font-bold">{{ s.title }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button @click.stop="toggleSceneCompleted(s)" class="px-3 py-1 text-sm rounded transition" :class="isSceneCompleted(s.id) ? 'bg-green-100 border-green-400 text-green-700 border' : 'border border-gray-300 text-gray-500 hover:bg-green-50'">
                {{ isSceneCompleted(s.id) ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
              </button>
              <button @click.stop="toggleFav(s)" class="px-3 py-1 text-sm rounded transition" :class="isFav(s) ? 'bg-yellow-100 border-yellow-400 text-yellow-700 border' : 'border border-gray-300 text-gray-500 hover:bg-yellow-50'">
                {{ isFav(s) ? t('★ 收藏中', '★ Favorited') : t('☆ 收藏', '☆ Favorite') }}
              </button>
            </div>
          </div>
          <div v-if="filteredScenes.length === 0" class="text-center py-10 text-gray-500">{{ t('該当するシーンがありません', 'No matching scenes') }}</div>
        </div>
      </div></div>
    </div>
  
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-4 mb-4">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&laquo;</button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&lsaquo;</button>
          <span class="px-3 py-1 text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&rsaquo;</button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&raquo;</button>
        </div>`
};

const SceneDetail = {
  data() { return { scene: null, isLoading: true, allScenes: [] }; },
  mounted() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[2];
    if (id) {
      fetch('/japanese-data/scenes.json?t=' + Date.now())
        .then(r => r.json())
        .then(data => {
          this.allScenes = data;
          this.scene = data.find(s => s.id == Number(id) || s.id == id);
          this.isLoading = false;
        });
    } else {
      this.isLoading = false;
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredScenes() {
      return this.allScenes.filter(s => s.level === this.currentLevel);
    },
    currentIndex() {
      if (!this.scene) return -1;
      return this.filteredScenes.findIndex(s => s.id === this.scene.id);
    },
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.filteredScenes.length - 1;
    },
    hasPrev() {
      return this.currentIndex > 0;
    },
    nextScene() {
      if (!this.hasNext) return null;
      return this.filteredScenes[this.currentIndex + 1];
    },
    prevScene() {
      if (!this.hasPrev) return null;
      return this.filteredScenes[this.currentIndex - 1];
    }
  },
  methods: {
    isFav() { return this.scene ? isFavorite('scenes', this.scene.id) : false; },
    toggleFav() {
      if (this.scene) {
        const isNowFav = toggleFavorite('scenes', { id: this.scene.id, title: this.scene.title, level: this.scene.level });
        if (!isNowFav) { this.$emit('navigate', '/scenes'); return; }
        }
    },
    isCompleted() { return this.scene ? isCompleted('scenes', this.scene.id) : false; },
    toggleSceneCompleted() { if (this.scene) toggleCompleted('scenes', this.scene); },
    t(zh, en) { return languageStore.language === 'en' ? en : zh; },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    goToNext() {
      if (this.nextScene) {
        this.$emit('navigate', '/scene/' + this.nextScene.id);
      }
    },
    goToPrev() {
      if (this.prevScene) {
        this.$emit('navigate', '/scene/' + this.prevScene.id);
      }
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('シーン詳細', 'Scene Detail') }}</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/scenes')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">{{ t('← 一覧に戻る', '← Back to List') }}</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('← 前へ', '← Prev') }}</button>
            <button @click="goToPrev" :disabled="!hasPrev" :class="hasPrev ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-2xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else-if="scene" class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-2xl font-bold text-purple-900">{{ scene.title }}</h2>
            <span class="px-3 py-1 text-sm rounded-full" :class="levelBadge(scene.level)">{{ scene.level }}</span>
          </div>
          <div class="border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">{{ t('会話 (Dialogues)', 'Dialogues') }}</h3>
            <div class="space-y-3">
              <div v-for="(d, idx) in scene.lines" :key="idx" class="flex gap-3">
                <div class="flex-shrink-0 w-20 text-sm font-semibold text-purple-600 text-right">{{ d.speaker }}</div>
                <div class="flex-1 bg-gray-50 p-3 rounded-lg">
                  <p class="text-gray-800">{{ d.jp }}</p>
                  <p class="text-gray-500 text-sm mt-1">{{ d.en }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t pt-4 mt-4 flex gap-2">
            <button @click="toggleFav" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isFav() ? 'bg-yellow-100 border border-yellow-400 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'">
              {{ isFav() ? t('★ 收藏中（タップで解除）', '★ Favorited (tap to remove)') : t('☆ 收藏に追加', '☆ Add to Favorites') }}
            </button>
            <button @click="toggleSceneCompleted" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isCompleted() ? 'bg-green-100 border border-green-400 text-green-700 hover:bg-green-200' : 'bg-green-400 hover:bg-green-500 text-green-900'">
              {{ isCompleted() ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
            </button>
          </div>
        </div>
        <div v-else class="text-center py-10 text-red-500">{{ t('シーンが見つかりませんでした', 'Scene not found') }}</div>
      </div></div>
    </div>
  `
};

// ----- Topics -----

const Topics = {
  data() { return { topics: [], isLoading: true, showAll: false, currentPage: 1 }; },
  mounted() {
    fetch('/japanese-data/topics.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.topics = data; this.isLoading = false; });
  },
  watch: {
    currentPage() {
      this.$nextTick(() => {
        const el = document.querySelector('.list-scroll-top');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredTopics() {
      let result = this.topics.filter(t => t.level === this.currentLevel);
      if (!this.showAll) {
        result = result.filter(t => !isCompleted('topics', t.id));
      }
      return result.sort((a, b) => b.id - a.id);
    },
    totalPages() {
      return Math.ceil(this.filteredTopics.length / 30);
    },
    pagedTopics() {
      const start = (this.currentPage - 1) * 30;
      return this.filteredTopics.slice(start, start + 30);
    }
  },
  methods: {
    goToDetail(t) { this.$emit('navigate', '/topic/' + t.id); },
    isFav(t) { return isFavorite('topics', t.id); },
    toggleFav(t) {
      toggleFavorite('topics', { id: t.id, title: t.title, level: t.level });
    },
    isTopicCompleted(id) { return isCompleted('topics', id); },
    toggleTopicCompleted(t) { toggleCompleted('topics', t); },
    t(zh, en) { return languageStore.language === 'en' ? en : zh; },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">{{ t('読解 (Topic Reading)', 'Topic Reading') }}</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="showAll = !showAll" class="px-3 py-2 text-sm rounded transition" :class="showAll ? 'bg-yellow-100 border-yellow-400 text-yellow-700 border' : 'bg-gray-200 border border-gray-300 text-gray-700 hover:bg-yellow-50'">
              {{ showAll ? t('📋 全量表示中', '📋 Showing All') : t('📋 全量表示', '📋 Show All') }}
            </button>
            <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('読み込み中...', 'Loading...') }}</div>
        <div v-else class="space-y-2">
          <div v-for="(t, idx) in pagedTopics" :key="t.id" @click="goToDetail(t)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between" :class="idx === 0 ? 'list-scroll-top' : ''">
            <div class="flex-1">
              <span class="text-lg font-bold">{{ t.title }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button @click.stop="toggleTopicCompleted(t)" class="px-3 py-1 text-sm rounded transition" :class="isTopicCompleted(t.id) ? 'bg-green-100 border-green-400 text-green-700 border' : 'border border-gray-300 text-gray-500 hover:bg-green-50'">
                {{ isTopicCompleted(t.id) ? '✓ 学习完毕' : '○ 学习完毕' }}
              </button>
              <button @click.stop="toggleFav(t)" class="px-3 py-1 text-sm rounded transition" :class="isFav(t) ? 'bg-yellow-100 border-yellow-400 text-yellow-700 border' : 'border border-gray-300 text-gray-500 hover:bg-yellow-50'">
                {{ isFav(t) ? '★ 收藏中' : '☆ 收藏' }}
              </button>
            </div>
          </div>
          <div v-if="filteredTopics.length === 0" class="text-center py-10 text-gray-500">{{ t('該当する読解がありません', 'No matching topics') }}</div>
        </div>
      </div></div>
    </div>
  
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-4 mb-4">
          <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&laquo;</button>
          <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1 rounded border text-sm" :class="currentPage === 1 ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&lsaquo;</button>
          <span class="px-3 py-1 text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&rsaquo;</button>
          <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="px-3 py-1 rounded border text-sm" :class="currentPage === totalPages ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-gray-700 border-gray-300 hover:bg-gray-100'">&raquo;</button>
        </div>`
};

const TopicDetail = {
  data() { return { topic: null, isLoading: true, showAnswers: false, allTopics: [] }; },
  mounted() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[2];
    if (id) {
      fetch('/japanese-data/topics.json?t=' + Date.now())
        .then(r => r.json())
        .then(data => {
          this.allTopics = data;
          this.topic = data.find(t => t.id == Number(id) || t.id == id);
          this.isLoading = false;
        });
    } else {
      this.isLoading = false;
    }
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredTopics() {
      return this.allTopics.filter(t => t.level === this.currentLevel);
    },
    currentIndex() {
      if (!this.topic) return -1;
      return this.filteredTopics.findIndex(t => t.id === this.topic.id);
    },
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.filteredTopics.length - 1;
    },
    hasPrev() {
      return this.currentIndex > 0;
    },
    nextTopic() {
      if (!this.hasNext) return null;
      return this.filteredTopics[this.currentIndex + 1];
    },
    prevTopic() {
      if (!this.hasPrev) return null;
      return this.filteredTopics[this.currentIndex - 1];
    }
  },
  methods: {
    isFav() { return this.topic ? isFavorite('topics', this.topic.id) : false; },
    toggleFav() {
      if (this.topic) {
        const isNowFav = toggleFavorite('topics', { id: this.topic.id, title: this.topic.title, level: this.topic.level });
        if (!isNowFav) { this.$emit('navigate', '/topics'); return; }
        }
    },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    goToNext() {
      if (this.nextTopic) {
        this.$emit('navigate', '/topic/' + this.nextTopic.id);
      }
    },
    goToPrev() {
      if (this.prevTopic) {
        this.$emit('navigate', '/topic/' + this.prevTopic.id);
      }
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">読解詳細</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/topics')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">← 一覧に戻る</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">← 前へ</button>
            <button @click="goToPrev" :disabled="!hasPrev" :class="hasPrev ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">次へ →</button>
          </div>
        </div>
      </div>
      <div class="px-4"><div class="max-w-2xl mx-auto">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">読み込み中...</div>
        <div v-else-if="topic" class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-2xl font-bold text-yellow-900">{{ topic.title }}</h2>
            <span class="px-3 py-1 text-sm rounded-full" :class="levelBadge(topic.level)">{{ topic.level }}</span>
          </div>
          <div class="border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-2">本文 (Reading)</h3>
            <div class="text-gray-700 leading-relaxed whitespace-pre-line">{{ topic.body }}</div>
          </div>
          <div v-if="topic.questions && topic.questions.length" class="border-t pt-4 mt-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">問題 (Questions)</h3>
            <div class="space-y-4">
              <div v-for="(q, idx) in topic.questions" :key="idx" class="bg-gray-50 p-4 rounded-lg">
                <p class="font-medium text-gray-800 mb-2">{{ idx + 1 }}. {{ q.question }}</p>
                <div class="space-y-1">
                  <div v-for="(opt, oidx) in q.options" :key="oidx" class="text-gray-600 text-sm pl-4" :class="showAnswers && opt.startsWith(q.answer) ? 'font-bold text-green-700' : ''">{{ opt }}</div>
                </div>
                <p v-if="showAnswers" class="mt-2 text-sm text-green-700 font-medium">答え: {{ q.answer }}</p>
              </div>
            </div>
          </div>
          <div class="border-t pt-4 mt-4">
            <button @click="toggleFav" class="w-full py-3 font-semibold rounded-lg transition" :class="isFav() ? 'bg-yellow-100 border border-yellow-400 text-yellow-700 hover:bg-yellow-200' : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'">
              {{ isFav() ? '★ 收藏中（タップで解除）' : '☆ 收藏に追加' }}
            </button>
          </div>
        </div>
        
        <!-- Answer Button - Fixed Bottom Right -->
        <div v-if="topic && topic.questions && topic.questions.length" class="fixed bottom-6 right-6">
          <button @click="showAnswers = !showAnswers" class="px-5 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition font-medium">
            {{ showAnswers ? '答えを隠す' : '答えを表示' }}
          </button>
        </div>
        
        <div v-else class="text-center py-10 text-red-500">読解が見つかりませんでした</div>
      </div></div>
    </div>
  `
};

// ----- Favorites with Dropdown -----

const Favorites = {
  data() {
    return {
      category: 'words',
      categories: [
        { key: 'words', label: '単語' },
        { key: 'grammar', label: '文法' },
        { key: 'scenes', label: 'シーン' },
        { key: 'topics', label: '読解' }
      ]
    };
  },
  computed: {
    favorites() { return getCategoryFavorites(this.category); },
    currentLabel() { return this.categories.find(c => c.key === this.category)?.label || ''; },
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredFavorites() {
      const cur = this.currentLevel;
      return this.favorites.filter(f => f.level === cur || !f.level);
    }
  },
  methods: {
    goToDetail(item) {
      const routes = { words: '/word/', grammar: '/grammar/', scenes: '/scene/', topics: '/topic/' };
      this.$emit('navigate', routes[this.category] + item.id);
    },
    removeFav(item) {
      toggleFavorite(this.category, item);
    },
    levelBadge(level) {
      const colors = { 'N0': 'bg-purple-100 text-purple-800', 'N1': 'bg-blue-100 text-blue-800', 'N2': 'bg-green-100 text-green-800', 'N3': 'bg-orange-100 text-orange-800', 'N4': 'bg-yellow-100 text-yellow-800', 'N5': 'bg-gray-100 text-gray-800' };
      return colors[level] || 'bg-gray-100 text-gray-800';
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold">⭐ 收藏一覧</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span>
          </div>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← 戻る</button>
        </div>
        <div class="max-w-4xl mx-auto mt-3">
          <select v-model="category" class="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option v-for="cat in categories" :key="cat.key" :value="cat.key">{{ cat.label }}</option>
          </select>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="filteredFavorites.length === 0" class="text-center py-10 text-gray-500">
          {{ currentLabel }}の該当レベルの收藏はまだありません。
        </div>
        <div v-else class="space-y-2">
          <div v-for="item in filteredFavorites" :key="item.id" @click="goToDetail(item)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
            <div class="flex-1">
              <span v-if="category === 'words'" class="text-lg font-bold">{{ item.word }}</span>
              <span v-else class="text-lg font-bold">{{ item.title }}</span>
              <span v-if="category === 'words'" class="text-gray-500 ml-3">{{ item.reading }}</span>
              <span v-else-if="category === 'grammar'" class="text-gray-500 ml-3">{{ item.meaning }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="item.level" class="px-2 py-0.5 text-xs rounded-full" :class="levelBadge(item.level)">{{ item.level }}</span>
              <button @click.stop="removeFav(item)" class="px-3 py-1 text-sm rounded bg-yellow-100 border-yellow-400 text-yellow-700 border">★ 收藏中</button>
            </div>
          </div>
        </div>
      </div></div>
    </div>
  `
};

// ========== Settings ==========

const Settings = {
  data() {
    return {
      selectedLevel: this.getSavedLevel(),
      selectedLanguage: languageStore.language,
      saved: false
    };
  },
  methods: {
    save() {
      userLevelStore.setLevel(this.selectedLevel);
      languageStore.setLanguage(this.selectedLanguage);
      this.saved = true;
      setTimeout(() => { this.saved = false; }, 2000);
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('设定 (Settings)', 'Settings') }}</h1>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">

        <!-- JLPT Level Selection -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">📊 {{ t('日语等级 (JLPT Level)', 'JLPT Level') }}</h2>
          <select v-model="selectedLevel" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option v-for="level in ['N0','N1','N2','N3','N4','N5']" :key="level" :value="level">{{ level }}</option>
          </select>
        </div>

        <!-- Language Selection -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">🌐 {{ t('母语语言 (Native Language)', 'Native Language') }}</h2>
          <select v-model="selectedLanguage" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <!-- Save Button -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <button @click="save" class="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
            {{ t('保存', 'Save') }}
          </button>
          <p v-if="saved" class="mt-3 text-sm text-green-600 font-medium text-center">✓ {{ t('已保存！', 'Saved!') }}</p>
        </div>

      </div></div>
    </div>
  `
};



// ----- Practice (练习题) -----

const PracticeCategorySelect = {
  data() { 
    return { 
      categories: [],
      counts: {},
      isLoadingCounts: true
    }; 
  },
  computed: {
    currentLevel() { return this.getSavedLevel(); }
  },
  mounted() {
    this.categories = [
      { key: 'grammar', label: '文法', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { key: 'reading', label: '漢字読み', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { key: 'reading_comp', label: '読解', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
    ];
    this.loadCounts();
  },
  methods: {
    goToCategory(catKey, level) {
      this.$emit('navigate', `/practice/${catKey}/${level}`);
    },
    levelBadge(level) {
      const colors = {
        'N0': 'bg-purple-100 text-purple-800',
        'N1': 'bg-blue-100 text-blue-800',
        'N2': 'bg-green-100 text-green-800',
        'N3': 'bg-orange-100 text-orange-800',
        'N4': 'bg-yellow-100 text-yellow-800',
        'N5': 'bg-gray-100 text-gray-800'
      };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    t(zh, en) { return this.languageStore.language === 'en' ? en : zh; },
    loadCounts() {
      const level = this.currentLevel.toLowerCase();
      const files = [
        `practice/practice_${level}_.json`,
        `practice/practice_${level}_extra.json`
      ];
      
      Promise.all(files.map(f => 
        fetch(`/japanese-data/${f}?t=${Date.now()}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )).then(([main, extra]) => {
        const all = [...main, ...extra];
        const counts = { grammar: 0, reading: 0, reading_comp: 0, vocab: 0 };
        
        all.forEach(set => {
          const cat = set.category || '';
          const qCount = (set.questions || []).length;
          if (cat === '文法' || cat === 'grammar') {
            counts.grammar += qCount;
          } else if (cat === '漢字読み' || cat === 'reading') {
            counts.reading += qCount;
          } else if (cat === '読解' || cat === 'reading_comp') {
            counts.reading_comp += qCount;
          } else if (cat === '語彙' || cat === 'vocab') {
            counts.vocab += qCount;
          } else {
            counts.grammar += qCount;
            counts.reading += qCount;
            counts.reading_comp += qCount;
          }
        });
        
        this.counts = counts;
        this.isLoadingCounts = false;
      });
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('練習題類型', 'Practice Types') }}</h1>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('戻る', 'Back') }}</button>
        </div>
      </div>
      <div class="px-4">
        <div class="max-w-4xl mx-auto mt-6">
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-700 mb-4">{{ t('選擇題型', 'Select Practice Type') }}</h2>
            <p class="text-sm text-gray-500 mb-4">{{ t('当前级别：', 'Current level:') }} <span class="font-bold" :class="levelBadge(currentLevel)">{{ currentLevel }}</span></p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button v-for="cat in categories" :key="cat.key"
                @click="goToCategory(cat.key, currentLevel)"
                class="py-4 px-4 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 text-left">
                <div class="text-xl mb-1">{{ cat.label }}</div>
                <div class="text-xs opacity-80">
                  <span v-if="isLoadingCounts">...</span>
                  <span v-else>{{ counts[cat.key] || 0 }} 题</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// ----- Practice List (某题型+级别的套题列表) -----
const PracticeList = {
  data() { return { sets: [], isLoading: true, categoryKey: '', level: '' }; },
  mounted() {
    const parts = window.location.hash.split('/');
    // /practice/grammar/N3
    this.categoryKey = parts[2] || 'grammar';
    this.level = parts[3] || this.getSavedLevel();
    this.loadSets();
  },
  watch: {
    categoryKey() { this.loadSets(); },
    level() { this.loadSets(); }
  },
  computed: {
    currentLevel() { return this.getSavedLevel(); },
    categoryLabel() {
      const map = {
        'grammar': '文法',
        'reading': '漢字読み',
        'reading_comp': '読解',
        'vocab': '語彙'
      };
      return map[this.categoryKey] || this.categoryKey;
    }
  },
  methods: {
    levelBadge(level) {
      const colors = {
        'N0': 'bg-purple-100 text-purple-800',
        'N1': 'bg-blue-100 text-blue-800',
        'N2': 'bg-green-100 text-green-800',
        'N3': 'bg-orange-100 text-orange-800',
        'N4': 'bg-yellow-100 text-yellow-800',
        'N5': 'bg-gray-100 text-gray-800'
      };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    loadSets() {
      this.isLoading = true;
      const catMap = {
        'grammar': '文法',
        'reading': '漢字読み',
        'reading_comp': '読解',
        'vocab': '語彙'
      };
      const catName = catMap[this.categoryKey] || this.categoryKey;
      const levelLower = this.level.toLowerCase();
      
      // Load both the main file and extra file
      const files = [
        `practice/practice_${levelLower}_.json`,
        `practice/practice_${levelLower}_extra.json`
      ];
      
      Promise.all(files.map(f => 
        fetch(`/japanese-data/${f}?t=${Date.now()}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )).then(([main, extra]) => {
        const all = [...main, ...extra];
        if (Array.isArray(all) && all.length > 0) {
          // For reading_comp, only accept actual 読解-category sets
          if (this.categoryKey === 'reading_comp') {
            this.sets = all.filter(s => s.category === '読解' || s.category === 'reading_comp');
          } else if (this.categoryKey === 'reading') {
            // 漢字読み: accept 漢字読み and any 総合 as fallback still fine for reading kanji
            this.sets = all.filter(s => s.category === '漢字読み' || s.category === 'reading' || !s.category);
          } else {
            this.sets = all.filter(s => s.category === catName || s.category === this.categoryKey || !s.category || s.category === '総合');
          }
        } else {
          this.sets = [];
        }
      }).finally(() => { this.isLoading = false; });
    },
    loadFallback() {
      // Deprecated: loadSets now handles both files
      this.sets = [];
      this.isLoading = false;
    },
    goToSet(s) {
      this.$emit('navigate', `/practice/set/${encodeURIComponent(s.title)}/${this.categoryKey}/${this.level}`);
    },
    t(zh, en) { return this.languageStore.language === 'en' ? en : zh; }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold">{{ categoryLabel }} 練習</h1>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(level)">{{ level }}</span>
          </div>
          <div class="flex gap-2">
            <button @click="level = 'N5'" class="px-3 py-1.5 text-sm rounded border" :class="level==='N5'?'bg-indigo-100 border-indigo-400 text-indigo-700':'border-gray-300 text-gray-600 hover:bg-gray-100'">N5</button>
            <button @click="level = 'N4'" class="px-3 py-1.5 text-sm rounded border" :class="level==='N4'?'bg-indigo-100 border-indigo-400 text-indigo-700':'border-gray-300 text-gray-600 hover:bg-gray-100'">N4</button>
            <button @click="level = 'N3'" class="px-3 py-1.5 text-sm rounded border" :class="level==='N3'?'bg-indigo-100 border-indigo-400 text-indigo-700':'border-gray-300 text-gray-600 hover:bg-gray-100'">N3</button>
            <button @click="level = 'N2'" class="px-3 py-1.5 text-sm rounded border" :class="level==='N2'?'bg-indigo-100 border-indigo-400 text-indigo-700':'border-gray-300 text-gray-600 hover:bg-gray-100'">N2</button>
            <button @click="level = 'N1'" class="px-3 py-1.5 text-sm rounded border" :class="level==='N1'?'bg-indigo-100 border-indigo-400 text-indigo-700':'border-gray-300 text-gray-600 hover:bg-gray-100'">N1</button>
            <button @click="$emit('navigate', '/practice')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← {{ t('返回类型选择', 'Back') }}</button>
          </div>
        </div>
      </div>
      <div class="px-4">
        <div class="max-w-4xl mx-auto mt-6">
          <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('加载中...', 'Loading...') }}</div>
          <div v-else-if="sets.length === 0" class="text-center py-10 text-gray-500">
            {{ t('暂无练习题，可返回生成更多', 'No practice sets available yet.') }}
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="(s, idx) in sets" :key="idx"
              @click="goToSet(s)"
              class="bg-white p-5 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-bold text-gray-800">{{ s.title }}</h3>
                <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{{ s.category || categoryLabel }}</span>
              </div>
              <div class="text-sm text-gray-500 space-y-1">
                <div>{{ t('题型说明', 'Instructions') }}: {{ s.body ? s.body.substring(0, 60) + '...' : '' }}</div>
                <div v-if="s.questions">{{ t('题目数量', 'Questions') }}: {{ s.questions.length }} 题</div>
              </div>
              <div class="mt-3 text-xs text-indigo-600 font-medium">{{ t('点击开始', 'Click to start') }} →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// ----- Practice Set Detail (答题详情) -----
const PracticeSetDetail = {
  data() { return { set: null, isLoading: true, currentQIdx: 0, answers: {}, showAnswers: false, finished: false }; },
  mounted() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    // /practice/set/标题/grammar/N3
    // parts: ["", "practice", "set", "title", "grammar", "N3"]
    if (parts.length >= 6) {
      const encodedTitle = parts[3];
      const categoryKey = parts[4] || 'grammar';
      const level = parts[5] || this.getSavedLevel();
      this.loadSet(encodedTitle, categoryKey, level);
    } else {
      this.isLoading = false;
    }
  },
  computed: {
    currentLevel() { return this.getSavedLevel(); },
    currentQuestion() {
      if (!this.set || !this.set.questions) return null;
      return this.set.questions[this.currentQIdx] || null;
    },
    progress() {
      if (!this.set || !this.set.questions) return 0;
      return Math.round((this.currentQIdx + 1) / this.set.questions.length * 100);
    },
    allAnswered() {
      if (!this.set || !this.set.questions) return false;
      return this.set.questions.every((q, i) => this.answers[i] !== undefined);
    }
  },
  methods: {
    levelBadge(level) {
      const colors = {
        'N0': 'bg-purple-100 text-purple-800',
        'N1': 'bg-blue-100 text-blue-800',
        'N2': 'bg-green-100 text-green-800',
        'N3': 'bg-orange-100 text-orange-800',
        'N4': 'bg-yellow-100 text-yellow-800',
        'N5': 'bg-gray-100 text-gray-800'
      };
      return colors[level] || 'bg-gray-100 text-gray-800';
    },
    loadSet(encodedTitle, categoryKey, level) {
      this.isLoading = true;
      this.categoryKey = categoryKey;
      this.level = level;
      const catMap = {
        'grammar': '文法',
        'reading': '漢字読み',
        'reading_comp': '読解',
        'vocab': '語彙'
      };
      const catName = catMap[categoryKey] || categoryKey;
      const levelLower = level.toLowerCase();
      const decodedTitle = decodeURIComponent(encodedTitle);

      const files = [
        `practice/practice_${levelLower}_.json`,
        `practice/practice_${levelLower}_extra.json`
      ];

      Promise.all(files.map(f =>
        fetch(`/japanese-data/${f}?t=${Date.now()}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )).then(([main, extra]) => {
        const all = [...main, ...extra];
        let found = null;
        
        // Try exact title match first
        for (const set of all) {
          if (set.title === decodedTitle || encodeURIComponent(set.title) === encodedTitle) {
            found = set;
            break;
          }
        }
        
        // Try fuzzy category match
        if (!found) {
          found = all.find(s => s.category === catName || s.category === categoryKey);
        }
        
        this.set = found || null;
      }).catch(() => { this.set = null; })
        .finally(() => { this.isLoading = false; });
    },
    loadFallbackSet(encodedTitle, categoryKey, level) {
      // Deprecated: loadSet now handles both files
      this.set = null;
      this.isLoading = false;
    },
    selectAnswer(qIdx, answer) {
      this.answers[qIdx] = answer;
    },
    nextQuestion() {
      if (this.currentQIdx < (this.set?.questions?.length || 0) - 1) {
        this.currentQIdx++;
      } else {
        this.finished = true;
      }
      this.showAnswers = false;
    },
    prevQuestion() {
      if (this.currentQIdx > 0) {
        this.currentQIdx--;
      }
      this.showAnswers = false;
    },
    restart() {
      this.currentQIdx = 0;
      this.answers = {};
      this.showAnswers = false;
      this.finished = false;
    },
    t(zh, en) { return this.languageStore.language === 'en' ? en : zh; }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- 顶部栏 -->
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button @click="$emit('navigate', '/practice')" class="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">← {{ t('返回', 'Back') }}</button>
            <span class="px-3 py-1 text-sm rounded-full font-semibold" :class="levelBadge(set?.level)">{{ set?.level || '' }}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-500">{{ currentQIdx + 1 }} / {{ set?.questions?.length || 0 }}</div>
            <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 transition-all" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4">
        <div class="max-w-2xl mx-auto mt-6">
          <!-- 加载中 -->
          <div v-if="isLoading" class="text-center py-10 text-gray-500">{{ t('加载中...', 'Loading...') }}</div>

          <!-- 题目内容 -->
          <div v-else-if="set" class="bg-white rounded-lg shadow-lg p-6">
            <!-- 标题 -->
            <div class="flex items-center justify-between mb-4 border-b pb-3">
              <h2 class="text-lg font-bold text-gray-800">{{ set.title }}</h2>
              <span class="text-xs text-gray-400">{{ set.category || '' }}</span>
            </div>

            <!-- 题型说明 -->
            <div class="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-400">
              <p class="text-sm text-gray-600">{{ set.body || '' }}</p>
            </div>

            <!-- 当前问题 -->
            <div v-if="currentQuestion" class="mb-6">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">{{ t('问题', 'Q') }}{{ currentQIdx + 1 }}</span>
                <span v-if="answers[currentQIdx]" class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">✓ 已作答</span>
              </div>
              <p class="text-lg font-medium text-gray-800 mb-4 leading-relaxed">{{ currentQuestion.question }}</p>

              <!-- 选项 -->
              <div class="space-y-2">
                <button v-for="(opt, oidx) in currentQuestion.options" :key="oidx"
                  @click="selectAnswer(currentQIdx, (oidx+1).toString())"
                  :class="'w-full text-left px-4 py-3 rounded-lg border-2 transition flex items-center gap-3 ' +
                    (answers[currentQIdx] === (oidx+1).toString()
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 hover:border-indigo-300 text-gray-700')"
                >
                  <span class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold flex-shrink-0
                    " :class="answers[currentQIdx] === (oidx+1).toString() ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'">
                    {{ oidx + 1 }}
                  </span>
                  <span class="flex-1">{{ opt }}</span>
                  <span v-if="showAnswers && opt.startsWith(currentQuestion.answer)" class="text-green-600 font-bold text-sm">✓</span>
                  <span v-if="showAnswers && opt.startsWith(currentQuestion.answer) && answers[currentQIdx] !== (oidx+1).toString()" class="text-red-400 text-sm">✗</span>
                </button>
              </div>

              <!-- 显示答案 -->
              <div v-if="showAnswers" class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p class="text-sm text-green-700 font-medium">
                  {{ t('正确答案', 'Correct answer') }}: {{ currentQuestion.options[parseInt(currentQuestion.answer)-1] || currentQuestion.answer }}
                </p>
              </div>
            </div>

            <!-- 导航按钮 -->
            <div class="flex items-center justify-between border-t pt-4 mt-4">
              <button @click="prevQuestion" :disabled="currentQIdx === 0"
                class="px-4 py-2 text-sm rounded border" :class="currentQIdx===0?'border-gray-200 text-gray-300 cursor-not-allowed':'border-gray-300 hover:bg-gray-100'">
                ← {{ t('上一题', 'Prev') }}
              </button>
              <div class="flex gap-2">
                <button @click="showAnswers = !showAnswers"
                  class="px-4 py-2 text-sm rounded" :class="showAnswers ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
                  {{ showAnswers ? t('隐藏答案', 'Hide Answers') : t('显示答案', 'Show Answers') }}
                </button>
                <button @click="nextQuestion"
                  class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  {{ currentQIdx === (set?.questions?.length || 0) - 1 ? t('完成', 'Finish') : t('下一题', 'Next') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 完成视图 -->
          <div v-else-if="finished" class="bg-white rounded-lg shadow-lg p-8 text-center">
            <div class="text-5xl mb-4">🎉</div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">{{ t('完成！', 'Completed!') }}</h2>
            <p class="text-gray-500 mb-6">{{ set?.title }}</p>

            <div class="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
              <div class="bg-green-50 rounded-lg p-3">
                <div class="text-2xl font-bold text-green-700">{{ set?.questions?.filter((q, i) => answers[i] === q.answer).length || 0 }}</div>
                <div class="text-xs text-green-600">{{ t('正确', 'Correct') }}</div>
              </div>
              <div class="bg-red-50 rounded-lg p-3">
                <div class="text-2xl font-bold text-red-700">{{ set?.questions?.filter((q, i) => answers[i] !== q.answer && answers[i] !== undefined).length || 0 }}</div>
                <div class="text-xs text-red-600">{{ t('错误', 'Wrong') }}</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="text-2xl font-bold text-gray-600">{{ Math.round((set?.questions?.filter((q, i) => answers[i] === q.answer).length || 0) / (set?.questions?.length || 1) * 100) }}%</div>
                <div class="text-xs text-gray-500">{{ t('正确率', 'Accuracy') }}</div>
              </div>
            </div>

            <div class="flex gap-3 justify-center">
              <button @click="restart" class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {{ t('重新练习', 'Retry') }}
              </button>
              <button @click="$emit('navigate', '/practice/' + categoryKey + '/' + level)" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                {{ t('返回列表', 'Back to List') }}
              </button>
            </div>

            <!-- 答案回顾 -->
            <div v-if="set?.questions?.length" class="mt-8 text-left max-w-md mx-auto">
              <h3 class="text-sm font-semibold text-gray-500 uppercase mb-3">{{ t('答案回顾', 'Answer Review') }}</h3>
              <div class="space-y-2">
                <div v-for="(q, idx) in set.questions" :key="idx"
                  class="flex items-center gap-3 p-2 rounded bg-gray-50">
                  <span class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                    :class="answers[idx] === q.answer ? 'bg-green-500 text-white' : 'bg-red-400 text-white'">
                    {{ answers[idx] || '?' }}
                  </span>
                  <span class="flex-1 text-sm text-gray-700 truncate">{{ q.question }}</span>
                  <span class="text-xs text-gray-400">→ {{ q.options[parseInt(q.answer)-1] || q.answer }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// ========== Version History Component ==========

const VersionHistory = {
  data() {
    return {
      version: '0.0',
      history: [],
      isLoading: true
    };
  },
  mounted() {
    fetch('/version.json?t=' + Date.now())
      .then(r => r.json())
      .then(json => {
        this.version = json.latest_version || '0.0';
        this.history = (json.history || []).slice().reverse();
        this.isLoading = false;
      })
      .catch(() => {
        this.version = '0.0';
        this.isLoading = false;
      });
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-800">📋 版本歷史</h1>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← 返回</button>
        </div>
      </div>
      <div class="px-4">
        <div class="max-w-2xl mx-auto">
          <div class="bg-gray-100 rounded-lg p-4 mb-4 text-center">
            <span class="text-sm text-gray-500">當前版本</span>
            <span class="text-2xl font-bold text-indigo-600 ml-2">{{ version }}</span>
          </div>
          <div v-if="isLoading" class="text-center py-8 text-gray-500">載入中...</div>
          <div v-else-if="history.length === 0" class="text-center py-8 text-gray-500">無歷史記錄</div>
          <div v-else class="space-y-3">
            <div v-for="(item, idx) in history" :key="idx"
              class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div class="flex items-center gap-3 mb-2">
                <span class="font-mono font-bold text-indigo-600 text-lg">{{ item.version }}</span>
                <span class="text-xs text-gray-400">{{ item.date }} {{ item.time }}</span>
              </div>
              <p class="text-sm text-gray-700">{{ item.message }}</p>
              <p class="text-xs text-gray-400 mt-1">commit: {{ item.sha }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute bottom-2 right-4 text-xs text-gray-400">v{{ version }}</div>
    </div>
  `
};

// ========== Routes ==========

const routes = {
  '/': Home,
  '/home': Home,
  '/version-history': VersionHistory,
  '/words': Words,
  '/word/:id': WordDetail,
  '/grammar': Grammar,
  '/grammar/:id': GrammarDetail,
  '/scenes': Scenes,
  '/scene/:id': SceneDetail,
  '/topics': Topics,
  '/topic/:id': TopicDetail,
  '/favorites': Favorites,
  '/settings': Settings,
  '/practice': PracticeCategorySelect,
  '/practice/:catKey/:level': PracticeList,
  '/practice/set/:encodedTitle/:catKey/:level': PracticeSetDetail
};

function matchRoute(path) {
  if (routes[path]) return routes[path];
  if (path.startsWith('/word/')) return routes['/word/:id'];
  if (path.startsWith('/grammar/')) return routes['/grammar/:id'];
  if (path.startsWith('/scene/')) return routes['/scene/:id'];
  if (path.startsWith('/topic/')) return routes['/topic/:id'];
  if (path.startsWith('/practice/set/')) return routes['/practice/set/:encodedTitle/:catKey/:level'];
  if (path.startsWith('/practice/')) return routes['/practice/:catKey/:level'];
  return routes['/'];
}

// ========== App ==========

const app = createApp({
  data() {
    return { currentPath: '/' };
  },
  computed: {
    currentComponent() {
      return matchRoute(this.currentPath);
    }
  },
  methods: {
    navigate(path) {
      this.currentPath = path;
      window.location.hash = path;
    }
  },
  mounted() {
    const hash = window.location.hash.slice(1);
    if (hash && hash !== '/' && hash !== '') {
      this.currentPath = hash;
    } else {
      this.currentPath = '/home';
    }
  },
  template: `<component :is="currentComponent" :key="currentPath" @navigate="navigate"></component>`
});

// Expose global helpers to all components
app.config.globalProperties.getSavedLevel = getSavedLevel;
app.config.globalProperties.userLevelStore = userLevelStore;
app.config.globalProperties.languageStore = languageStore;
app.config.globalProperties.t = t;

app.config.globalProperties.isCompleted = isCompleted;
app.config.globalProperties.toggleCompleted = toggleCompleted;

app.mount('#app');
