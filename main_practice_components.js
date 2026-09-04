
// ----- Practice (练习题) -----

const PracticeCategorySelect = {
  data() { return { categories: [] }; },
  computed: {
    currentLevel() { return this.getSavedLevel(); }
  },
  mounted() {
    // 从已有的 practice 文件中发现有哪些题型
    const discovered = new Set();
    const catMap = {
      '文法': 'grammar',
      '漢字読み': 'reading',
      '漢字書き': 'writing',
      '語彙': 'vocab',
      '読解': 'reading',
      '表現': 'expression'
    };
    // 扫描所有 practice JSON 文件，收集类别
    const files = [
      'practice_n5_grammar.json', 'practice_n4_grammar.json',
      'practice_n3_grammar.json', 'practice_n2_grammar.json', 'practice_n1_grammar.json',
      'practice_n5_reading.json', 'practice_n4_reading.json',
      'practice_n3_reading.json', 'practice_n2_reading.json', 'practice_n1_reading.json',
      'practice_n5_vocab.json', 'practice_n4_vocab.json',
      'practice_n3_vocab.json', 'practice_n2_vocab.json', 'practice_n1_vocab.json',
    ];
    // 先用我们已生成的文件
    const existingFiles = [
      { level: 'N5', cat: '語彙', file: 'practice/practice_n5_.json' },
      { level: 'N3', cat: '文法', file: 'practice/practice_n3_.json' },
      { level: 'N2', cat: '漢字読み', file: 'practice/practice_n2_.json' },
      { level: 'N1', cat: '読解', file: 'practice/practice_n1_.json' },
    ];
    // 这里简化：直接用固定映射
    this.categories = [
      { key: 'grammar', label: '文法', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { key: 'reading', label: '単語読音（漢字読み）', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
      { key: 'reading_comp', label: '読解', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
    ];
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
    t(zh, en) { return this.languageStore.language === 'en' ? en : zh; }
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
                <div class="text-xs opacity-80">{{ t('点开开始练习', 'Click to start') }}</div>
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
      // 尝试加载匹配的 practice 文件
      const fileName = `practice/practice_${levelLower}_.json`;
      fetch(`/japanese-data/${fileName}?t=${Date.now()}`)
        .then(r => {
          if (!r.ok) throw new Error('not found');
          return r.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            this.sets = data.filter(s => s.category === catName || s.category === this.categoryKey || !s.category);
          } else if (data && data.questions) {
            this.sets = [data];
          } else {
            this.sets = [];
          }
        })
        .catch(() => {
          // fallback: 尝试静态映射文件
          this.loadFallback();
        })
        .finally(() => { this.isLoading = false; });
    },
    loadFallback() {
      // 如果上面的文件不存在，尝试从对应级别的专门文件加载
      const catMap = {
        'grammar': 'grammar',
        'reading': 'reading',
        'reading_comp': 'reading',
        'vocab': 'vocab'
      };
      const suffix = catMap[this.categoryKey] || 'grammar';
      const fileName = `practice/practice_${this.level.toLowerCase()}_${suffix}.json`;
      fetch(`/japanese-data/${fileName}?t=${Date.now()}`)
        .then(r => {
          if (!r.ok) throw new Error('not found');
          return r.json();
        })
        .then(data => {
          this.sets = Array.isArray(data) ? data : (data && data.questions ? [data] : []);
        })
        .catch(() => { this.sets = []; })
        .finally(() => { this.isLoading = false; });
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
    if (parts.length >= 5) {
      const encodedTitle = parts[2];
      const categoryKey = parts[3] || 'grammar';
      const level = parts[4] || this.getSavedLevel();
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

      // 先尝试直接从文件找
      const fileName = `practice/practice_${levelLower}_.json`;
      fetch(`/japanese-data/${fileName}?t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          let found = null;
          if (Array.isArray(data)) {
            found = data.find(s => s.title === decodeURIComponent(encodedTitle) || encodeURIComponent(s.title) === encodedTitle);
            if (!found) {
              // 尝试按类别模糊匹配
              found = data.find(s => s.category === catName || s.category === categoryKey);
            }
          } else if (data && data.questions) {
            found = data;
          }
          if (found) {
            this.set = found;
          } else {
            // fallback 另一个文件名
            return this.loadFallbackSet(encodedTitle, categoryKey, level);
          }
        })
        .catch(() => {
          return this.loadFallbackSet(encodedTitle, categoryKey, level);
        })
        .finally(() => { this.isLoading = false; });
    },
    loadFallbackSet(encodedTitle, categoryKey, level) {
      const catMap = {
        'grammar': 'grammar',
        'reading': 'reading',
        'reading_comp': 'reading',
        'vocab': 'vocab'
      };
      const suffix = catMap[categoryKey] || 'grammar';
      const fileName = `practice/practice_${level.toLowerCase()}_${suffix}.json`;
      fetch(`/japanese-data/${fileName}?t=${Date.now()}`)
        .then(r => {
          if (!r.ok) throw new Error('not found');
          return r.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            this.set = data.find(s => s.title === decodeURIComponent(encodedTitle) || encodeURIComponent(s.title) === encodedTitle) || data[0];
          } else if (data && data.questions) {
            this.set = data;
          } else {
            this.set = null;
          }
        })
        .catch(() => { this.set = null; })
        .finally(() => { this.isLoading = false; });
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
    },
    prevQuestion() {
      if (this.currentQIdx > 0) {
        this.currentQIdx--;
      }
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
