# Implementation Plan: 数唱テスト（Digit Span Test）

**Branch**: `001-digit-span-working` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)

## Summary

WAIS-IV形式の数唱テスト（順唱・逆唱・整列の3パート）をブラウザ上で動作するクライアントサイドWebアプリとして実装する。数字の読み上げはWeb Speech APIを使用し日本語で読み上げる。各パートは桁数を増やしながら2問ずつ出題し、同一桁数で2問連続不正解なら打ち切り。順唱・逆唱はボーナスステージとして最大15桁まで継続。外部依存なし、サーバー不要のオフライン動作。

## Technical Context

**Language/Version**: HTML5 + Vanilla JavaScript（ES2020）

**Primary Dependencies**: なし（外部ライブラリ不使用）

**Storage**: なし（セッション内メモリのみ）

**Testing**: ブラウザでの手動テスト（Chrome / Safari / Edge）

**Target Platform**: モダンブラウザ（Chrome 90+、Safari 14+、Edge 90+）、iOS/Android対応

**Project Type**: クライアントサイドWebアプリ（HTML+CSS+JS）

**Performance Goals**: 読み上げ終了から入力フォーム有効化まで500ms以内、カウントダウン誤差±1秒以内

**Constraints**: サーバー不要・オフライン動作可、Web Speech API依存（非対応ブラウザはエラー表示）

**Scale/Scope**: 単一ユーザー・セッション完結、永続化なし

## Constitution Check

Constitutionは未設定のため、プロジェクト固有のゲート条件なし。代替ゲートとして以下を採用：

- [x] 外部依存なし（純粋HTML+JS）
- [x] モバイル・PC両対応（レスポンシブ）
- [x] Web Speech API非対応時のフォールバック定義済み
- [x] セッション完結（永続化・認証なし）

## Project Structure

### Documentation (this feature)

```text
specs/001-digit-span-test/
├── plan.md          # このファイル
├── research.md      # Phase 0: 技術調査結果
├── data-model.md    # Phase 1: 状態・データ構造定義
├── quickstart.md    # Phase 1: 開発・動作確認手順
└── tasks.md         # Phase 2: タスク一覧（/speckit.tasks で生成）
```

### Source Code (repository root)

```text
index.html           # アプリ本体（単一エントリポイント）
css/
└── style.css        # レスポンシブスタイル
js/
├── app.js           # 画面ルーター・状態管理
├── game.js          # ゲームロジック（数列生成・採点・進級判定）
├── speech.js        # Web Speech APIラッパー（読み上げ・検出）
└── timer.js         # カウントダウンタイマー
```

**Structure Decision**: 外部ビルドツール不要のシンプルな分割構成。`index.html`から各JSをscriptタグで読み込む。CSSは1ファイルにまとめてメンテナンス性を確保。シングルページとして実装し、画面の切り替えはDOM表示制御（show/hide）で行う。
