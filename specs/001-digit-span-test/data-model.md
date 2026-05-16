# Data Model: 数唱テスト

**Phase**: 1 | **Feature**: 数唱テスト（Digit Span Test）

---

## アプリ状態（AppState）

アプリ全体の状態はメモリ上の1つのオブジェクトとして管理する。

```javascript
const AppState = {
  // --- パート設定 ---
  partType: null,
  // 型: 'forward' | 'backward' | 'sequence' | null
  // forward  = 順唱（そのまま復唱）
  // backward = 逆唱（逆順で回答）
  // sequence = 整列（昇順で回答）

  // --- フェーズ ---
  phase: 'idle',
  // 型: 'idle' | 'practice' | 'test'
  // idle     = TOP画面（パート未選択）
  // practice = 練習問題中
  // test     = 本番テスト中

  // --- 進行管理 ---
  practiceRound: 0,       // 練習回数 (0=1問目, 1=2問目)
  currentDigits: 2,       // 現在出題中の桁数 (2〜15)
  trialIndex: 0,          // 同桁数内の試行番号 (0=1問目, 1=2問目)
  isBonus: false,         // ボーナスステージ中か否か

  // --- 現在の問題 ---
  currentSequence: [],    // 型: number[]  例: [5, 2, 9]
  correctAnswer: [],      // 型: number[]  採点用の正解数列
  // forward:  correctAnswer = currentSequence
  // backward: correctAnswer = [...currentSequence].reverse()
  // sequence: correctAnswer = [...currentSequence].sort((a,b)=>a-b)

  // --- 入力状態 ---
  isSpeaking: false,      // 読み上げ中フラグ（この間は入力無効）
  isAwaitingAnswer: false,// 回答待ち状態フラグ
  timerRemaining: 0,      // カウントダウン残り秒数

  // --- 結果履歴 ---
  history: [],            // HistoryEntry[] の配列（画面下部に累積表示）
};
```

---

## HistoryEntry（1問の記録）

```javascript
const HistoryEntry = {
  digits: 0,          // 型: number  この問題の桁数
  trialIndex: 0,      // 型: number  0 または 1
  phase: 'test',      // 型: 'practice' | 'test'
  isBonus: false,     // 型: boolean  ボーナスステージか否か
  sequence: [],       // 型: number[]  出題された数列
  userAnswer: [],     // 型: number[]  ユーザーが入力した数字列
  correct: false,     // 型: boolean  正解かどうか
};
```

---

## PartConfig（パート設定定数）

各パートの設定値を定数オブジェクトとして保持する。

```javascript
const PART_CONFIG = {
  forward: {
    label: '順唱',
    rule: 'そのまま復唱してください',
    startDigits: 2,
    normalMaxDigits: 9,
    bonusMaxDigits: 15,
    hasBonus: true,
    getAnswer: (seq) => [...seq],
  },
  backward: {
    label: '逆唱',
    rule: '逆の順番で答えてください',
    startDigits: 2,
    normalMaxDigits: 8,
    bonusMaxDigits: 15,
    hasBonus: true,
    getAnswer: (seq) => [...seq].reverse(),
  },
  sequence: {
    label: '整列',
    rule: '小さい順に並べ替えて答えてください',
    startDigits: 2,
    normalMaxDigits: 8,
    bonusMaxDigits: null,
    hasBonus: false,
    getAnswer: (seq) => [...seq].sort((a, b) => a - b),
  },
};
```

---

## 画面遷移（State Machine）

```
[TOP]
  │
  ├─ ユーザーがパートを選択
  ▼
[PRACTICE_INTRO]  ← ルール説明 + 「練習を始める」ボタン
  │
  ├─ 「練習を始める」をタップ
  ▼
[SPEAKING]  ← 数字読み上げ中（入力フォーム非活性）
  │
  ├─ 読み上げ完了
  ▼
[ANSWERING]  ← 30秒カウントダウン中（入力フォーム活性）
  │
  ├─ 回答ボタン押下 or タイムアウト
  ▼
[PRACTICE_FEEDBACK]  ← 正誤表示（練習のみ、本番は即次へ）
  │
  ├─ practiceRound < 2 なら SPEAKING へ戻る
  ├─ practiceRound = 2 なら TEST_READY へ
  ▼
[TEST_READY]  ← 「テスト開始」ボタン表示
  │
  ├─ 「テスト開始」をタップ
  ▼
[SPEAKING]  ← 本番テスト問題の読み上げ
  │
  ├─ 読み上げ完了
  ▼
[ANSWERING]  ← 30秒カウントダウン中
  │
  ├─ 回答 or タイムアウト
  ▼
[SCORING]  ← 正誤判定・進級/打ち切り判断
  │
  ├─ 次問あり → SPEAKING へ
  └─ パート終了 → PART_END
  ▼
[PART_END]  ← 結果表示 + Restart / TOPへ戻るボタン
```

---

## 採点ロジック

```javascript
/**
 * ユーザー入力文字列を数字配列に変換して正解と比較する
 * @param {string} inputStr - ユーザー入力 e.g. "592"
 * @param {number[]} correctAnswer - 正解配列 e.g. [5, 9, 2]
 * @returns {boolean}
 */
function judgeAnswer(inputStr, correctAnswer) {
  const parsed = inputStr.trim().split('').map(Number);
  if (parsed.length !== correctAnswer.length) return false;
  return parsed.every((d, i) => d === correctAnswer[i]);
}
```

---

## 進級・打ち切り判定ロジック

```javascript
/**
 * 同桁数の2問が終了した時点で次アクションを決定する
 * @param {boolean} trial1Correct
 * @param {boolean} trial2Correct
 * @param {AppState} state
 * @param {PartConfig} config
 * @returns {'next_digit' | 'enter_bonus' | 'end_part'}
 */
function decideProgression(trial1Correct, trial2Correct, state, config) {
  const anyCorrect = trial1Correct || trial2Correct;
  if (!anyCorrect) return 'end_part';  // 打ち切り

  const maxDigits = state.isBonus ? config.bonusMaxDigits : config.normalMaxDigits;
  if (state.currentDigits >= maxDigits) {
    if (!state.isBonus && config.hasBonus) return 'enter_bonus'; // ボーナスへ
    return 'end_part'; // 上限到達で正常終了
  }
  return 'next_digit'; // 桁数を上げて継続
}
```

---

## 練習問題データ（固定）

練習問題は毎回同じ問題を使用し、ユーザーがルールを確認しやすくする。

```javascript
const PRACTICE_SEQUENCES = {
  forward:  [[3, 8, 2], [5, 1, 7]],     // 3桁×2問
  backward: [[2, 4],    [5, 7, 4]],      // 2桁, 3桁
  sequence: [[2, 8, 6], [3, 1, 9, 4]],  // 3桁, 4桁
};
```
