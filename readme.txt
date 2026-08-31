# JLPT Learning App

A lightweight Progressive Web App (PWA) for studying Japanese Language Proficiency Test (JLPT) N1, N2, and N3 levels. 
This app stores all data locally on your NAS (QNAP) and runs entirely in the browser without requiring a backend server.

## 🧱 Built With

- **Vue.js 3** – Frontend framework
- **Tailwind CSS (via CDN)** – Utility-first CSS framework
- **Vanilla JavaScript (ES6+)** – No build tools required
- **JSON Files** – Stored on NAS for vocabulary, grammar, dialogues, and reading passages

## 📁 Project Structure

```
apex/
├── index.html              # Entry point (loads Vue & Tailwind via CDN)
├── main.js                 # Vue App initialization and routing
├── manifest.json           # PWA manifest
├── readme.txt              # This file
├── components/
│   ├── Home.js             # Main navigation page
│   ├── Words.js            # Vocabulary list with pagination
│   ├── Grammar.js          # Grammar list with pagination
│   ├── Scenes.js           # Dialogue scenes list
│   ├── Topics.js           # Reading comprehension topics
│   ├── Review.js           # Dashboard for starred items
│   ├── Settings.js         # Settings page (placeholder)
│   ├── ImportantWords.js   # Starred vocabulary
│   ├── ImportantGrammar.js # Starred grammar
│   ├── ImportantScenes.js  # Starred dialogues
│   ├── ImportantTopics.js  # Starred topics
│   ├── WordDetail.js       # Detailed view of a word
│   ├── GrammarDetail.js    # Detailed view of a grammar point
│   ├── SceneDialog.js      # Scene dialogue viewer
│   └── TopicReader.js      # Topic reading viewer
├── japanese-data/
│   ├── words.json          # Vocabulary data
│   ├── grammar.json        # Grammar data
│   ├── scenes.json         # Dialogue scenes
│   └── topics.json         # Reading comprehension passages
└── japanese-assets/
    └── icon-*.png          # Placeholder icons (replace with real PNGs)
```

## 🚀 Features

### ✅ Core Pages
- Homepage with quick links to all sections
- Vocabulary list with search, pagination, and star/favorite system
- Grammar list with similar functionality
- Scene dialogues categorized by JLPT level (N3/N2/N1)
- Thematic reading comprehensions with questions
- Review dashboard for starred content
- Settings page (currently placeholder)

### 🔧 Technical Details
- All learning data stored in JSON format on NAS
- Accessed via HTTP GET requests using Fetch API
- Starred favorites saved in browser localStorage
- Responsive design compatible with mobile devices
- Can be installed as PWA on home screen

### 🌟 Future Enhancements
- Add audio pronunciation guides
- Integrate AI chatbot for conversation practice
- Track learning progress and statistics
- User-defined categories and tags
- Offline mode with service workers and caching strategies

## 📡 How It Works

The app loads all data directly from:
```
/share/Web/japanese-data/*.json
```

Ensure your NAS web server allows public access to these files.

## 🛠️ Setup Instructions

1. Place all files under `/share/Web/japanese-app/`
2. Ensure NAS web server serves `.json` MIME type correctly
3. Access from browser at:  
   `http://<your-nas-ip>/japanese-app/`
4. Install on device home screen for native-like experience

## 💾 Data Format Examples

### words.json
Each entry includes:
- id
- word
- reading
- meaning
- level
- examples []

## 🤖 AI Integration Placeholder

There is a reserved section in the Settings page labeled "AIチャット (準備中)" where future AI capabilities can be added.

---

Happy Studying! 🎌
