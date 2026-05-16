# Research: 数唱テスト技術調査

**Phase**: 0 | **Feature**: 数唱テスト（Digit Span Test）

## 1. Web Speech API — 日本語読み上げ

### Decision
`SpeechSynthesisUtterance` を使い、各数字を1つずつ個別のUtteranceとしてキューに積んで読み上げる。

### Rationale
- 一括文字列で渡すと数字間の間隔が不均一になりやすく、聞き取りにくい
- 1数字ずつキューイングすることで均等なポーズを制御できる
- `onend` / `onboundary` イベントで読み上げ完了を確実に検出できる

### Implementation Pattern
```javascript
function speakDigits(digits, onComplete) {
  window.speechSynthesis.cancel();
  const utterances = digits.map(d => {
    const u = new SpeechSynthesisUtterance(DIGIT_NAMES_JA[d]);
    u.lang = 'ja-JP';
    u.rate = 0.9;   // やや遅め（聞き取りやすさ優先）
    return u;
  });
  utterances[utterances.length - 1].onend = onComplete;
  utterances.forEach(u => window.speechSynthesis.speak(u));
}
```

### 日本語数字読み方マッピング
| 数字 | 読み方 | 備考 |
|------|--------|------|
| 0    | ぜろ   | れい でも可 |
| 1    | いち   | |
| 2    | に     | |
| 3    | さん   | |
| 4    | よん   | し は避ける（死を連想させるため） |
| 5    | ご     | |
| 6    | ろく   | |
| 7    | なな   | しち は避ける（1と聞き間違えやすい） |
| 8    | はち   | |
| 9    | きゅう | く は避ける（9と区別しにくい場合がある） |

### iOS Safari の注意点
- iOS Safariでは `speechSynthesis.speak()` をユーザーインタラクション（タップ）のイベントハンドラー内から呼び出す必要がある
- **対策**: 「開始」ボタンのクリックイベント内から直接呼び出す
- ページ読み込み直後の自動読み上げは機能しない

### Alternatives Considered
- 音声ファイル事前録音: 実装コスト高・ファイル管理が必要 → 却下
- 一括テキスト読み上げ: 間隔制御が困難 → 却下

---

## 2. モバイル数値入力

### Decision
`<input type="text" inputmode="numeric" pattern="[0-9]*">` を採用する。

### Rationale
- `inputmode="numeric"` でiOS/AndroidともにテンキーUIを表示
- `type="number"` は上下矢印ボタンが表示され、長い数列の入力には不向き
- `type="tel"` は電話番号記号（*, #）が含まれる場合がある
- `pattern="[0-9]*"` でHTML5バリデーションとして数字のみを許容

### JavaScriptによる追加バリデーション
```javascript
input.addEventListener('input', () => {
  input.value = input.value.replace(/[^0-9]/g, '');
});
```

### Alternatives Considered
- `type="number"`: スピナーUI・マイナス入力可 → 不適
- `type="tel"`: 電話記号あり → 不採用

---

## 3. 数列のランダム生成

### 標準ステージ（2〜9桁）

**Decision**: Fisher-Yates シャッフルで [1-9] から N 個を非復元抽出する。0は除外（WAIS-IVの慣行に準拠）。

```javascript
function generateSequence(length) {
  const pool = [1,2,3,4,5,6,7,8,9];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, length);
}
```

### ボーナスステージ（10〜15桁）

**Decision**: 0〜9の10個の数字から復元抽出（重複あり）。連続する同一数字は避ける。

```javascript
function generateBonusSequence(length) {
  const digits = [];
  let prev = -1;
  while (digits.length < length) {
    const d = Math.floor(Math.random() * 10);
    if (d !== prev) { digits.push(d); prev = d; }
  }
  return digits;
}
```

### Alternatives Considered
- 事前に問題リストを定義: 練習用に固定問題を持つのは合理的だが、本番はランダムで多様性を確保 → 練習のみ固定問題を使用

---

## 4. カウントダウンタイマー

### Decision
`Date.now()` ベースのドリフト補正タイマーを使用する。

```javascript
class CountdownTimer {
  constructor(seconds, onTick, onExpire) {
    this.total = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
  }
  start() {
    this.startTime = Date.now();
    this.intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.total - elapsed);
      this.onTick(remaining);
      if (remaining === 0) { this.stop(); this.onExpire(); }
    }, 250); // 250ms間隔で精度向上
  }
  stop() { clearInterval(this.intervalId); }
}
```

### Rationale
- `setInterval(fn, 1000)` は累積ドリフトが発生する（要件：±1秒以内）
- 250ms間隔でチェックすることで表示更新の遅延を最小化

---

## 5. 画面状態管理

### Decision
シンプルな状態オブジェクト + `showScreen(id)` 関数による DOM show/hide 制御。

```javascript
// 画面ID定義
const SCREENS = {
  TOP: 'screen-top',
  PRACTICE: 'screen-practice',
  TEST: 'screen-test',
  RESULT: 'screen-result'
};

const state = {
  partType: null,        // 'forward' | 'backward' | 'sequence'
  phase: 'practice',    // 'practice' | 'test'
  practiceRound: 0,      // 0 or 1
  currentDigits: 2,      // 現在の桁数
  trialIndex: 0,         // 0 or 1 (同桁数内の試行番号)
  currentSequence: [],   // 現在出題中の数列
  history: [],           // { digits, trial, sequence, answer, correct }
  isBonus: false,        // ボーナスステージか否か
  isSpeaking: false,     // 読み上げ中フラグ
  timerActive: false,    // タイマー動作中フラグ
};
```

### Alternatives Considered
- URLハッシュによるルーティング: 過剰 → 却下
- Reactなどのフレームワーク: 依存禁止 → 却下

---

## 6. 進級・打ち切りロジック確認

### パートごとの設定値

| パート | 開始桁数 | 通常最大桁数 | ボーナス最大桁数 | 重複許可 |
|--------|----------|-------------|----------------|---------|
| 順唱   | 2        | 9           | 15             | ボーナスのみ |
| 逆唱   | 2        | 8           | 15             | ボーナスのみ |
| 整列   | 2        | 8           | なし            | なし    |

### 進級判定フロー
```
trial1終了
  → trial2へ

trial2終了
  → 2問とも✗ → パート打ち切り → END
  → 1問以上○
      → 現在桁数 < 通常最大桁数 → 桁数+1、trial1へ
      → 現在桁数 = 通常最大桁数（かつボーナスあり） → isBonus=true、桁数+1、trial1へ
      → 現在桁数 = ボーナス最大桁数 → パート正常終了 → END
      → 現在桁数 < ボーナス最大桁数（isBonus=true） → 桁数+1、trial1へ
```

---

## 7. レスポンシブ設計方針

- ベースフォントサイズ: 16px（モバイル）/ 18px（デスクトップ）
- ブレークポイント: 600px（スマートフォン/タブレット境界）
- 入力フォーム: 最小高さ44px（タップターゲット確保）
- カウントダウン表示: 大きめのフォント（3rem以上）で視認性確保
- 横スクロール禁止: `max-width: 100%; box-sizing: border-box`
