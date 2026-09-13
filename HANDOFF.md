# Schnapsen Handoff

この資料は、VS Code で操作している Codex にシュナプセン開発を引き継ぐためのメモです。

## 引き継ぎ先で最初にやること

1. VS Code でこのフォルダを開きます。

```bash
/Users/masuta/Documents/work/codex/games/card_games/schnapsen
```

2. GitHub から取得する場合は、下記リポジトリを clone します。

```bash
git clone https://github.com/GameMasuta/CardGame_Shnapsen.git
cd CardGame_Shnapsen
```

3. 状態確認とテストを実行します。

```bash
git status
node --check app.js
node test.js
```

4. 動作確認は `index.html` をブラウザで直接開きます。必要なら簡易サーバーでも確認できます。

```bash
python3 -m http.server 8000
```

その場合は `http://localhost:8000` を開きます。

## 現在の状態

- ブランチ: `main`
- GitHub remote: `https://github.com/GameMasuta/CardGame_Shnapsen.git`
- 最新の主な実装: ダークモード切替
- 依存パッケージ: なし
- ビルド工程: なし
- テスト: `node test.js`

## ファイル構成

- `index.html`: 画面構造。難易度選択、ダークモード切替、ゲーム盤、ログ、ダイアログ領域を定義。
- `styles.css`: 通常テーマ、ダークテーマ、カード、盤面、アニメーション、得点ダイアログのスタイル。
- `app.js`: ゲーム状態、シュナプセンのルール処理、CPU思考、描画、アニメーション、ダイアログ制御。
- `test.js`: Node.js 上でロジックを検証する簡易テスト。
- `README.md`: 公開向けの概要と起動方法。
- `.gitignore`: OS/エディタ/ログ系ファイルの除外設定。

## 実装済み機能

- 20枚デッキのシュナプセン
- 対CPU戦
- CPU難易度: Easy / Normal / Difficult
- マリッジ宣言
- 切札J交換
- クローズ
- 66点宣言
- 7ゲームポイント先取
- カード移動アニメーション
- 得点・勝敗・次ディール確認ダイアログ
- ダークモードON/OFFスイッチ

## 重要な設計メモ

- このアプリは依存なしの静的Webアプリです。`npm install` は不要です。
- 画面の状態は `app.js` の `state` オブジェクトで管理しています。
- UI要素参照は `app.js` の `els` オブジェクトに集約しています。
- ダークモードは `state.darkMode` と `document.body.classList.toggle("dark-mode", ...)` で切り替えています。
- 得点ダイアログは自動で消えません。クリック、Space、Enter で閉じます。
- ディール終了後は、勝敗ダイアログを閉じると次ディール確認ダイアログが自動表示されます。
- CPUの66点宣言は、実得点が66点以上の場合のみ行います。見込み点では宣言しません。
- `scheduleAction` は古いタイマーが盤面に影響しないよう `actionToken` を確認します。

## よく触る関数

- `startNewMatch()`: 試合の初期化。
- `startNewDeal()`: ディールの初期化。
- `getLegalMoves(player)`: 合法手判定。
- `resolveTrick()`: トリック勝敗と得点処理。
- `checkDealEnd()`: ディール終了判定。
- `shouldCpuDeclareVictory()`: CPUの66点宣言判定。
- `chooseCpuPlay()`: CPUの出すカード選択。
- `render()`: 画面描画。
- `showOverlay()` / `closeOverlay()`: ダイアログ制御。
- `animateCardFlight()`: カード移動アニメーション。

## 変更時の確認手順

コード変更後は最低限これを実行します。

```bash
node --check app.js
node test.js
git status --short
```

UI変更をした場合は、ブラウザで以下を目視確認します。

- 通常モードで表示が崩れていないこと
- ダークモードON/OFFが切り替わること
- 手札から場札へのカード移動が見えること
- 山札から手札へのカード移動が見えること
- 得点ダイアログがクリック、Space、Enter で閉じること
- ディール終了後に次ディール確認ダイアログが出ること

## Git運用

通常の更新手順です。

```bash
git status
git add .
git commit -m "変更内容を短く書く"
git push
```

このリポジトリでは `user.name=masuta`、`user.email=noreply` がローカル設定されています。

## 次に改善しやすい候補

- CPU思考の強化
- UIのモバイル最適化
- ルール説明の折りたたみ表示
- テストケース追加
- GitHub Pages での公開
