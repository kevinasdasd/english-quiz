# English Flashcard App

一个适合初中英语单词复习的本地闪卡 Web App，使用 React + TypeScript + Vite 实现。

## Features

- 教材与 Unit 选择
- 英文 -> 中文、中文 -> 英文两种学习模式
- 选中 Unit 后整轮随机打乱，不重复刷完
- 3D 翻转闪卡
- 英文正面自动朗读，中文 -> 英文模式不自动朗读
- 会了、不会、跳过、错题星标
- 错题集与结果页
- 本地词库：人教版 A 七年级下册 Unit 1-6，共 283 个词/短语

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- lucide-react

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173/
```

To preview from another computer on the same Wi-Fi:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the `Network` URL shown by Vite.

## Build

```bash
npm run build
```

## Data

Vocabulary data lives in:

```text
src/data/words.ts
```

Each word includes `id`, `book`, `unit`, `word`, `phonetic`, `partOfSpeech`, `translation`, and `example`.
