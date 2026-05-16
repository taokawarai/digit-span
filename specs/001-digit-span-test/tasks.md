# Tasks: 数唱テスト（Digit Span Test）

**Input**: Design documents from `specs/001-digit-span-test/`

**Branch**: `001-digit-span-working`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 他のタスクと並行実行可能（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）
- 各タスクには具体的なファイルパスを含む

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: ファイル構造とエントリポイントの作成

- [x] T001 リポジトリルートに `index.html`、`css/`、`js/` ディレクトリ構造を作成する（`plan.md` のプロジェクト構造に従う）
- [x] T002 `index.html` に DOCTYPE、`<meta charset="UTF-8">`、`<meta name="viewport">` などの基本骨格を記述し、`css/style.css` と `js/app.js`・`js/game.js`・`js/speech.js`・`js/timer.js` を読み込む `<link>`・`<script>` タグを追加する
- [x] T003 [P] `css/style.css` にCSSカスタムプロパティ（カラー・フォントサイズ変数）とボックスサイズリセットを定義する
- [x] T004 [P] `js/game.js` に `PART_CONFIG` 定数オブジェクトと `DIGIT_NAMES_JA` マッピング（`data-model.md` の定義に従う）を実装する
- [x] T005 [P] `js/app.js` に `AppState` オブジェクト初期値と `showScreen(id)` / `hideAllScreens()` ユーティリティ関数を実装する

**Checkpoint**: ブラウザで `index.html` を開いて空白ページが表示され、コンソールエラーがないこと

---

## Phase 2: Foundational（基盤実装）

**Purpose**: すべてのユーザーストーリーが依存する共通基盤

**⚠️ CRITICAL**: このフェーズ完了前にユーザーストーリーの実装を開始しないこと

- [x] T006 `index.html` に4つの画面セクション（`#screen-top`・`#screen-practice`・`#screen-test`・`#screen-result`）の空の `<div>` を追加し、`data-screen` 属性で識別できるようにする
- [x] T007 `js/speech.js` に `isSupported()` 関数（`window.speechSynthesis` の存在チェック）と `speakDigits(digits, onComplete)` 関数（`research.md` の実装パターンに従い、1数字ずつキューイング）を実装する
- [x] T008 [P] `js/timer.js` に `CountdownTimer` クラス（`research.md` の `Date.now()` ベースドリフト補正実装に従う）を実装する。`start()`・`stop()` メソッドと `onTick(remaining)`・`onExpire()` コールバックを持つ
- [x] T009 [P] `js/game.js` に `generateSequence(length)` 関数（Fisher-Yates シャッフルで `[1-9]` から非復元抽出）と `generateBonusSequence(length)` 関数（`[0-9]` から復元抽出、連続同一数字なし）を実装する
- [x] T010 [P] `js/game.js` に `judgeAnswer(inputStr, correctAnswer)` 関数を実装する（入力文字列を数字配列に変換し `correctAnswer` と完全一致を比較）
- [x] T011 [P] `js/game.js` に `decideProgression(trial1Correct, trial2Correct, state, config)` 関数を実装する（`data-model.md` の進級・打ち切り判定ロジックに従い `'next_digit'`・`'enter_bonus'`・`'end_part'` を返す）

**Checkpoint**: ブラウザのコンソールで `generateSequence(5)`・`judgeAnswer("52974", [5,2,9,7,4])` などを手動実行して動作確認できること

---

## Phase 3: User Story 1 — パート選択・ルール表示・練習（Priority: P1）🎯 MVP

**Goal**: TOPページでパートを選択し、ルールを確認したうえで2回の練習問題を実施できる

**Independent Test**: `index.html` を開き「順唱」を選択 → ルール説明が表示 → 練習問題が2回実施されること

### Implementation

- [x] T012 [US1] `index.html` の `#screen-top` に3つのパート選択ボタン（「順唱」「逆唱」「整列」）と見出しを追加する
- [x] T013 [P] [US1] `index.html` の `#screen-practice` にルール説明テキスト用の `<p>` 要素、練習問題の「開始」ボタン、フィードバック表示エリア（正解表示）を追加する
- [x] T014 [US1] `js/app.js` にパート選択ボタンのクリックハンドラーを実装する。`AppState.partType` を設定し `#screen-practice` を表示、ルール説明テキストを `PART_CONFIG[partType].rule` から動的にセットする
- [x] T015 [US1] `js/app.js` に練習フローを実装する。`PRACTICE_SEQUENCES[partType]` から固定数列を取得し、`speakDigits()` で読み上げ → 回答受付 → 正解を表示（練習は正解を開示）→ 2回完了後「テスト開始」ボタンを表示する（`data-model.md` の `PRACTICE_SEQUENCES` 定数を利用）
- [x] T016 [P] [US1] `css/style.css` に TOP画面とPRACTICE画面のスタイル（ボタン・ルール説明・フィードバックの配置）を追加する

**Checkpoint**: パート選択 → ルール表示 → 練習2回 → 「テスト開始」ボタン表示 が一連で動作すること

---

## Phase 4: User Story 2 — 数字の読み上げと回答入力（Priority: P1）

**Goal**: 開始ボタン押下後に数字が日本語で読み上げられ、30秒以内に入力して回答できる

**Independent Test**: 「テスト開始」→「開始」ボタン → 読み上げ → カウントダウン → 入力 → 回答 の1問フルフローが完結すること

### Implementation

- [x] T017 [US2] `index.html` の `#screen-test` に「開始」ボタン、カウントダウン表示 `<div>`、数字入力 `<input type="text" inputmode="numeric" pattern="[0-9]*">`、回答ボタン（入力フォーム右側）を追加する
- [x] T018 [US2] `js/app.js` に「開始」ボタンのクリックハンドラーを実装する。`AppState.isSpeaking = true` にセット・入力フォームを `disabled` にして `speakDigits()` を呼び出す。読み上げ完了コールバックで `isSpeaking = false`・フォームを有効化・`CountdownTimer` を起動する
- [x] T019 [US2] `js/app.js` に `CountdownTimer` の `onTick` でカウントダウン表示を更新し、`onExpire` で自動不正解処理（タイムアウト時は空文字回答として `judgeAnswer` を呼び出す）を実装する
- [x] T020 [US2] `js/app.js` に回答ボタンのクリックハンドラーを実装する。タイマーを停止し `judgeAnswer(input.value, AppState.correctAnswer)` で正誤判定し、`AppState.history` にエントリを追記する
- [x] T021 [US2] `js/app.js` に入力フォームの `input` イベントハンドラーを追加する。`/[^0-9]/g` で数字以外を即時削除する
- [x] T022 [P] [US2] `css/style.css` に TEST画面のレイアウト（カウントダウン大字体・入力フォームと回答ボタンの横並び配置）を追加する
- [x] T023 [P] [US2] `js/speech.js` に Web Speech API 非対応ブラウザ向けエラー処理を追加する。`isSupported()` が `false` の場合 `#screen-top` にエラーメッセージを表示してボタンを無効化する

**Checkpoint**: 1問の全フロー（開始→読み上げ→カウントダウン→入力→回答）がブラウザで動作すること

---

## Phase 5: User Story 3 — 進級・打ち切りルールによる自動進行（Priority: P2）

**Goal**: 桁数管理・進級・打ち切り・ボーナスステージへの自動遷移が正確に動作する

**Independent Test**: 同桁数で2問連続不正解したとき、パートが終了し `#screen-result` に遷移すること

### Implementation

- [x] T024 [US3] `js/app.js` に問題ループ制御関数 `nextQuestion()` を実装する。`AppState.trialIndex`・`currentDigits`・`isBonus` を管理し、試行番号ごとに `generateSequence` または `generateBonusSequence` で新しい数列を生成して `AppState.currentSequence` と `correctAnswer` をセットする
- [x] T025 [US3] `js/app.js` に `handleAnswerSubmit()` 内で `AppState.trialIndex === 1`（同桁数2問目）のタイミングで `decideProgression()` を呼び出すロジックを追加する。結果に応じて `nextQuestion()` 呼び出し（続行）または `endPart()`（終了）に分岐する
- [x] T026 [US3] `js/app.js` に `endPart()` 関数を実装する。`AppState.phase` を `'idle'` にリセットし `#screen-result` を表示する
- [x] T027 [US3] `js/app.js` にボーナスステージ開始処理を追加する。`decideProgression` が `'enter_bonus'` を返した場合、`AppState.isBonus = true` にセットして `nextQuestion()` を継続呼び出しする
- [x] T028 [P] [US3] `index.html` の `#screen-result` にパート終了メッセージ（「最大桁数: X桁」など）、Restartボタン、TOPに戻るボタンを追加する

**Checkpoint**: 全パターン（通常終了・打ち切り・ボーナス突入・ボーナス打ち切り・ボーナス上限）がブラウザで動作確認できること

---

## Phase 6: User Story 4 — 結果履歴の確認とリスタート（Priority: P3）

**Goal**: 問題ごとの○×が下部に蓄積表示され、Restart・TOP戻りナビゲーションが機能する

**Independent Test**: 複数問回答後に画面下部に○×の履歴が表示され、Restartで最初に戻ること

### Implementation

- [x] T029 [US4] `index.html` の `#screen-test` 下部に履歴表示エリア `<div id="history-display">` を追加する（各エントリは `○` または `×` のspan要素として追記される）
- [x] T030 [US4] `js/app.js` に `appendHistoryEntry(entry)` 関数を実装する。`HistoryEntry` オブジェクトをもとに `○`/`×` の span 要素を `#history-display` にDOM追記する
- [x] T031 [US4] `js/app.js` に Restart ボタンのクリックハンドラーを実装する。`AppState` を初期値にリセット（`practiceRound=0`・`currentDigits=startDigits`・`history=[]` 等）し `#screen-practice` を表示して同パートの練習から再開する
- [x] T032 [US4] `js/app.js` に「TOPに戻る」ボタンのクリックハンドラーを実装する。`AppState` を全リセットして `#screen-top` を表示する
- [x] T033 [P] [US4] `css/style.css` に履歴表示エリアのスタイル（○は緑・×は赤のカラーコーディング、横並びフロー表示）を追加する

**Checkpoint**: 複数問回答後に○×が正しい色で横並びに表示され、Restart/TOPボタンが期待通りに動作すること

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: レスポンシブ対応・エッジケース・全体品質

- [x] T034 [P] `css/style.css` にレスポンシブスタイルを追加する。ブレークポイント `600px` でモバイルレイアウト（ボタン幅・フォントサイズ・タップターゲット44px以上）に切り替えるメディアクエリを実装する
- [x] T035 [P] `css/style.css` にカウントダウン表示（`3rem` 以上のフォントサイズ）と入力フォーム+回答ボタン横並びレイアウトのモバイル最適化スタイルを追加する
- [x] T036 `js/app.js` の `handleAnswerSubmit()` に読み上げ中（`AppState.isSpeaking === true`）の回答ボタン無効ガードを追加する
- [x] T037 [P] `index.html` にページタイトル（`<title>数唱テスト</title>`）、OGタグ不要、ファビコン参照を追加する
- [x] T038 `quickstart.md` の全チェックリスト項目を Chrome・Safari・Edge の3ブラウザで動作確認する。モバイル実機またはデベロッパーツールのデバイスモードでテンキー表示を確認する

---

## Dependencies & Execution Order

### フェーズ依存関係

- **Phase 1 (Setup)**: 依存なし — 即時開始可能
- **Phase 2 (Foundational)**: Phase 1 完了後 — すべてのUSをブロック
- **Phase 3 (US1)**: Phase 2 完了後
- **Phase 4 (US2)**: Phase 2 完了後（US1の `speakDigits` 呼び出し完了後に統合）
- **Phase 5 (US3)**: Phase 4 完了後（`judgeAnswer` と回答フローが必要）
- **Phase 6 (US4)**: Phase 5 完了後（`history` 追記はフル動作後が確認しやすい）
- **Phase 7 (Polish)**: US1〜US4 の実装完了後

### ユーザーストーリー内タスク依存

| タスク | 依存先 |
|--------|--------|
| T015 (練習フロー) | T007 (speakDigits), T009 (generateSequence) |
| T018 (開始ボタン) | T007 (speakDigits), T008 (CountdownTimer) |
| T025 (進級判定) | T010 (judgeAnswer), T011 (decideProgression) |
| T030 (履歴追記) | T020 (回答ハンドラ) |

### 並行実行可能グループ

```
Phase 2 完了後に並行実行可能:
  T007 (speech.js 基盤) と T008 (timer.js) と T009 (generateSequence) と T010/T011 (判定ロジック)

Phase 3 内で並行実行可能:
  T012 (TOP画面HTML) と T013 (PRACTICE画面HTML) と T016 (CSS)

Phase 4 内で並行実行可能:
  T022 (TEST画面CSS) と T023 (非対応ブラウザエラー処理)
```

---

## Implementation Strategy

### MVP First（US1 + US2 のみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（共通基盤）
3. Phase 3: US1 完了（パート選択・練習）
4. Phase 4: US2 完了（読み上げ・回答）
5. **STOP & VALIDATE**: 1問の全フローを3ブラウザで手動確認
6. 以降は US3（採点ロジック）→ US4（履歴・ナビ）→ Polish の順に追加

### Incremental Delivery

1. Setup + Foundational → 骨格完成
2. + US1 → パート選択と練習が動く（MVP基礎）
3. + US2 → 1問フルフロー（デモ可能なMVP）
4. + US3 → 進級・打ち切り・ボーナス（本番運用可能）
5. + US4 → 履歴・ナビゲーション（UX完成）
6. + Polish → クロスブラウザ・モバイル最適化

---

## Notes

- `[P]` タスクは異なるファイルへの変更のため並行実行可能
- `[USn]` ラベルはトレーサビリティのためにspec.mdのユーザーストーリーと対応
- 各フェーズのCheckpointでブラウザ動作確認を必ず実施する
- iOS Safariでの音声読み上げは必ずユーザーのタップ（開始ボタン）から呼び出すこと（research.md 参照）
- 練習問題は固定数列（`PRACTICE_SEQUENCES`）を使用し、本番はランダム生成
