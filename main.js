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

// ========== Auth ==========
function checkAuth() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

function setAuth(val) {
  if (val) {
    localStorage.setItem('isLoggedIn', 'true');
  } else {
    localStorage.removeItem('isLoggedIn');
  }
}

function getCurrentUser() {
  return localStorage.getItem('currentUsername') || '';
}

function setCurrentUser(username) {
  localStorage.setItem('currentUsername', username);
}

function clearCurrentUser() {
  localStorage.removeItem('currentUsername');
}

// ========== Users Store ==========
function getUsers() {
  const data = localStorage.getItem('users');
  if (!data) {
    const defaultUsers = [
      { username: 'admin', password: '1234', isAdmin: true },
      { username: 'user1', password: '1234', isAdmin: false },
      { username: 'user2', password: '1234', isAdmin: false }
    ];
    localStorage.setItem('users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(data);
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function findUser(username) {
  return getUsers().find(u => u.username === username);
}

function validateLogin(username, password) {
  const user = findUser(username);
  return user && user.password === password;
}

function resetPassword(username) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user) {
    user.password = '123456';
    saveUsers(users);
    return true;
  }
  return false;
}

function changePassword(username, oldPassword, newPassword) {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user && user.password === oldPassword) {
    user.password = newPassword;
    saveUsers(users);
    return true;
  }
  return false;
}

function isAdmin() {
  const username = getCurrentUser();
  const user = findUser(username);
  return user && user.isAdmin;
}

// ========== Components ==========

const Login = {
  data() {
    return {
      username: '',
      password: '',
      error: ''
    };
  },
  methods: {
    login() {
      if (validateLogin(this.username, this.password)) {
        setAuth(true);
        setCurrentUser(this.username);
        this.$emit('navigate', '/home');
      } else {
        this.error = '用户名或密码错误';
      }
    }
  },
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 class="text-3xl font-bold text-indigo-800 mb-2 text-center">JLPT Learning App</h1>
        <p class="text-gray-500 text-center mb-6">请登录以继续</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input v-model="username" type="text" placeholder="请输入用户名"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="login"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
          <button @click="login" class="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
            登录
          </button>
        </div>
        <p class="text-xs text-gray-400 text-center mt-4">默认账号: user1 / 1234</p>
      </div>
    </div>
  `
};

const Home = {
  methods: {
    logout() {
      setAuth(false);
      clearCurrentUser();
      this.$emit('navigate', '/login');
    }
  },
  computed: {
    isAdminUser() {
      return isAdmin();
    }
  },
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div class="w-full max-w-2xl flex justify-end mb-4">
        <button @click="logout" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium">登出</button>
      </div>
      <h1 class="text-4xl font-bold text-indigo-800 mb-8">JLPT Learning App</h1>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <button @click="$emit('navigate', '/words')" class="py-4 px-6 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700">📝 単語一覧 (Words List)</button>
        <button @click="$emit('navigate', '/grammar')" class="py-4 px-6 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">📖 文法一覧 (Grammar List)</button>
        <button @click="$emit('navigate', '/scenes')" class="py-4 px-6 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700">💬 シーン対話 (Scene Dialogues)</button>
        <button @click="$emit('navigate', '/topics')" class="py-4 px-6 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600">📚 読解 (Topic Reading)</button>
        <button @click="$emit('navigate', '/favorites')" class="py-4 px-6 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600">⭐ 收藏一覧 (Favorites)</button>
        <button @click="$emit('navigate', '/settings')" class="py-4 px-6 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600">⚙️ 設定 (Settings)</button>
        <button v-if="isAdminUser" @click="$emit('navigate', '/users')" class="py-4 px-6 bg-orange-600 text-white rounded-lg shadow-md hover:bg-orange-700">👥 用户管理</button>
        <button @click="$emit('navigate', '/changepassword')" class="py-4 px-6 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700">🔑 修改密码</button>
      </div>
    </div>
  `
};

// ----- Words -----

const Words = {
  data() { return { words: [], isLoading: true, showAll: false }; },
  mounted() {
    fetch('/japanese-data/words.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.words = data; this.isLoading = false; });
  },
  computed: {
    currentLevel() {
      return this.getSavedLevel();
    },
    filteredWords() {
      let result = this.words.filter(w => w.level === this.currentLevel);
      if (!this.showAll) {
        result = result.filter(w => !isCompleted('words', w.id));
      }
      return result.sort((a, b) => b.id - a.id);
    }
  },
  methods: {
    goToDetail(word) { this.$emit('navigate', '/word/' + word.id); },
    isFav(word) { return isFavorite('words', word.id); },
    toggleFav(word) {
      toggleFavorite('words', { id: word.id, word: word.word, reading: word.reading, meaning: word.meaning });
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
          <div v-for="word in filteredWords" :key="word.id" @click="goToDetail(word)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
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
      </div></div>
    </div>
  `
};

const WordDetail = {
  data() { return { word: null, isLoading: true, allWords: [] }; },
  mounted() {
    const hash = window.location.hash;
    const parts = hash.split('/');
    const id = parts[2];
    if (id) {
      fetch('/japanese-data/words.json?t=' + Date.now())
        .then(r => r.json())
        .then(data => {
          this.allWords = data;
          this.word = data.find(w => w.id == Number(id) || w.id == id);
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
    filteredWords() {
      return this.allWords.filter(w => w.level === this.currentLevel);
    },
    currentIndex() {
      if (!this.word) return -1;
      return this.filteredWords.findIndex(w => w.id === this.word.id);
    },
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.filteredWords.length - 1;
    },
    nextWord() {
      if (!this.hasNext) return null;
      return this.filteredWords[this.currentIndex + 1];
    }
  },
  methods: {
    isFav() { return this.word ? isFavorite('words', this.word.id) : false; },
    isWordCompleted() { return this.word ? isCompleted('words', this.word.id) : false; },
    toggleFav() {
      if (this.word) {
        const isNowFav = toggleFavorite('words', { id: this.word.id, word: this.word.word, reading: this.word.reading, meaning: this.word.meaning });
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
    toggleWordCompleted() {
      if (this.word) toggleCompleted('words', this.word);
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ this.t('単語詳細', 'Word Detail') }}</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/words')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">{{ t('← 一覧に戻る', '← Back to List') }}</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
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
            <button @click="toggleWordCompleted" class="flex-1 py-3 font-semibold rounded-lg transition" :class="isWordCompleted() ? 'bg-green-100 border border-green-400 text-green-700 hover:bg-green-200' : 'bg-green-400 hover:bg-green-500 text-green-900'">
              {{ isWordCompleted() ? t('✓ 学习完毕', '✓ Completed') : t('○ 学习完毕', '○ Mark Complete') }}
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
  data() { return { grammar: [], isLoading: true, showAll: false }; },
  mounted() {
    fetch('/japanese-data/grammar.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.grammar = data; this.isLoading = false; });
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
          <div v-for="g in filteredGrammar" :key="g.id" @click="goToDetail(g)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
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
  `
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
    nextGrammar() {
      if (!this.hasNext) return null;
      return this.filteredGrammar[this.currentIndex + 1];
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
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
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
  data() { return { scenes: [], isLoading: true, showAll: false }; },
  mounted() {
    fetch('/japanese-data/scenes.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.scenes = data; this.isLoading = false; });
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
          <div v-for="s in filteredScenes" :key="s.id" @click="goToDetail(s)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
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
  `
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
    nextScene() {
      if (!this.hasNext) return null;
      return this.filteredScenes[this.currentIndex + 1];
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
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ t('シーン詳細', 'Scene Detail') }}</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/scenes')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">{{ t('← 一覧に戻る', '← Back to List') }}</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">{{ t('次へ →', 'Next →') }}</button>
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
              <div v-for="(d, idx) in scene.dialogues" :key="idx" class="flex gap-3">
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
  data() { return { topics: [], isLoading: true, showAll: false }; },
  mounted() {
    fetch('/japanese-data/topics.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => { this.topics = data; this.isLoading = false; });
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
          <div v-for="t in filteredTopics" :key="t.id" @click="goToDetail(t)" class="bg-white p-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md transition flex items-center justify-between">
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
  `
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
    nextTopic() {
      if (!this.hasNext) return null;
      return this.filteredTopics[this.currentIndex + 1];
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
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">読解詳細</h1>
          <div class="flex gap-1.5">
            <button @click="$emit('navigate', '/topics')" class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition">← 一覧に戻る</button>
            <button @click="goToNext" :disabled="!hasNext" :class="hasNext ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 text-gray-300 cursor-not-allowed'" class="px-3 py-1.5 text-sm rounded-md transition">次へ →</button>
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
      return this.favorites.filter(f => f.level === this.currentLevel);
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

// ========== User Management ==========
const UserManagement = {
  data() {
    return {
      users: [],
      message: '',
      messageType: ''
    };
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    loadUsers() {
      this.users = getUsers();
    },
    resetPassword(username) {
      if (username === 'admin') {
        this.message = '不能重置管理员密码';
        this.messageType = 'error';
        return;
      }
      if (resetPassword(username)) {
        this.message = `用户 ${username} 密码已重置为 123456`;
        this.messageType = 'success';
        this.loadUsers();
      }
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">👥 用户管理</h1>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← 戻る</button>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div v-if="message" :class="messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="p-3 rounded-lg mb-4">{{ message }}</div>
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">用户名</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">密码</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">权限</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="user in users" :key="user.username" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">{{ user.username }}</td>
                <td class="px-4 py-3 text-sm font-mono">{{ user.password }}</td>
                <td class="px-4 py-3 text-sm">
                  <span :class="user.isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'" class="px-2 py-1 rounded text-xs font-medium">
                    {{ user.isAdmin ? '管理员' : '普通用户' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <button v-if="!user.isAdmin" @click="resetPassword(user.username)" class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs font-medium">
                    重置密码
                  </button>
                  <span v-else class="text-gray-400 text-xs">不可操作</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div></div>
    </div>
  `
};

// ========== Change Password ==========
const ChangePassword = {
  data() {
    return {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      message: '',
      messageType: ''
    };
  },
  computed: {
    currentUser() {
      return getCurrentUser();
    }
  },
  methods: {
    changePassword() {
      if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
        this.message = '请填写所有字段';
        this.messageType = 'error';
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.message = '新密码与确认密码不一致';
        this.messageType = 'error';
        return;
      }
      if (this.newPassword.length < 4) {
        this.message = '新密码至少4位';
        this.messageType = 'error';
        return;
      }
      if (changePassword(this.currentUser, this.oldPassword, this.newPassword)) {
        this.message = '密码修改成功，请重新登录';
        this.messageType = 'success';
        setTimeout(() => {
          setAuth(false);
          clearCurrentUser();
          this.$emit('navigate', '/login');
        }, 1500);
      } else {
        this.message = '原密码错误';
        this.messageType = 'error';
      }
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="sticky top-0 z-10 bg-gray-50 pb-2 pt-4 px-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold">🔑 修改密码</h1>
          <button @click="$emit('navigate', '/home')" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">← 戻る</button>
        </div>
      </div>
      <div class="px-4"><div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <p class="text-sm text-gray-500 mb-4">当前用户：<span class="font-semibold text-indigo-600">{{ currentUser }}</span></p>
          <div v-if="message" :class="messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="p-3 rounded-lg mb-4">{{ message }}</div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">原密码</label>
              <input v-model="oldPassword" type="password" placeholder="请输入原密码"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input v-model="newPassword" type="password" placeholder="请输入新密码"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
              <input v-model="confirmPassword" type="password" placeholder="请再次输入新密码" @keyup.enter="changePassword"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button @click="changePassword" class="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              确认修改
            </button>
          </div>
        </div>
      </div></div>
    </div>
  `
};

const Settings = {
  data() {
    return {
      selectedLevel: this.getSavedLevel(),
      selectedLanguage: languageStore.language,
      saved: false
    };
  },
  methods: {
    saveLevel() {
      userLevelStore.setLevel(this.selectedLevel);
      this.saved = true;
      setTimeout(() => { this.saved = false; }, 2000);
    },
    saveLanguage() {
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
          <p class="text-sm text-gray-500 mb-4">{{ t('选择当前学习的等级，筛选对应难度的内容。', 'Select your study level to filter content by difficulty.') }}</p>
          <select v-model="selectedLevel" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option v-for="level in ['N1','N2','N3','N4']" :key="level" :value="level">{{ level }}</option>
          </select>
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              {{ t('当前等级：', 'Current Level:') }}<span class="font-bold text-indigo-600">{{ selectedLevel }}</span>
            </p>
            <button @click="saveLevel" class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              {{ t('保存', 'Save') }}
            </button>
          </div>
          <p v-if="saved" class="mt-3 text-sm text-green-600 font-medium">✓ {{ t('已保存！', 'Saved!') }}</p>
        </div>

        <!-- Language Selection -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">🌐 {{ t('母语语言 (Native Language)', 'Native Language') }}</h2>
          <p class="text-sm text-gray-500 mb-4">{{ t('选择解释显示的语言。', 'Choose the language for explanations.') }}</p>
          <select v-model="selectedLanguage" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              {{ t('当前语言：', 'Current Language:') }}<span class="font-bold text-indigo-600">{{ selectedLanguage === 'zh' ? '中文' : 'English' }}</span>
            </p>
            <button @click="saveLanguage" class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              {{ t('保存', 'Save') }}
            </button>
          </div>
          <p v-if="saved" class="mt-3 text-sm text-green-600 font-medium">✓ {{ t('已保存！', 'Saved!') }}</p>
        </div>

      </div></div>
    </div>
  `
};

// ========== Routes ==========

const routes = {
  '/': Login,
  '/login': Login,
  '/home': Home,
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
  '/users': UserManagement,
  '/changepassword': ChangePassword
};

function matchRoute(path) {
  if (routes[path]) return routes[path];
  if (path.startsWith('/word/')) return routes['/word/:id'];
  if (path.startsWith('/grammar/')) return routes['/grammar/:id'];
  if (path.startsWith('/scene/')) return routes['/scene/:id'];
  if (path.startsWith('/topic/')) return routes['/topic/:id'];
  return routes['/'];
}

// ========== App ==========

const app = createApp({
  data() {
    return { currentPath: '/' };
  },
  computed: {
    currentComponent() {
      // Check auth for protected routes
      const protectedRoutes = ['/home', '/words', '/word', '/grammar', '/grammar', '/scenes', '/scene', '/topics', '/topic', '/favorites', '/settings', '/users', '/changepassword'];
      const isProtected = protectedRoutes.some(r => this.currentPath.startsWith(r));
      
      if (isProtected && !checkAuth()) {
        return Login;
      }
      
      // Admin-only routes
      if (this.currentPath.startsWith('/users') && !isAdmin()) {
        return Home;
      }
      
      return matchRoute(this.currentPath);
    }
  },
  methods: {
    navigate(path) {
      // Check auth for protected routes
      const protectedRoutes = ['/home', '/words', '/word', '/grammar', '/grammar', '/scenes', '/scene', '/topics', '/topic', '/favorites', '/settings', '/users', '/changepassword'];
      const isProtected = protectedRoutes.some(r => path.startsWith(r));
      
      if (isProtected && !checkAuth()) {
        this.currentPath = '/login';
        window.location.hash = '/login';
        return;
      }
      
      // Admin-only routes
      if (path.startsWith('/users') && !isAdmin()) {
        this.currentPath = '/home';
        window.location.hash = '/home';
        return;
      }
      
      this.currentPath = path;
      window.location.hash = path;
    }
  },
  mounted() {
    const hash = window.location.hash.slice(1);
    if (hash && hash !== '/' && hash !== '') {
      this.currentPath = hash;
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
