# PWA実装解説・委託先展開用参考資料

本資料はシュナプセンの実装をもとに、PWA化に必要なファイルと、画面右上の「＋」ボタンの処理を説明するものです。

今回の構成は「Webアプリをインストール可能にする設定」と「インストールを案内する画面・処理」に分かれます。オフライン動作、ゲーム途中の保存、通知機能は対象外です。

## 1. PWA化に伴って追加・変更したファイル

```text
公開サイト/
├── index.html
├── styles.css
├── app.js
├── install.js
├── manifest.webmanifest
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── apple-touch-icon.png
    └── favicon-32.png
```

| ファイル | 役割 | 対応 |
|---|---|---|
| [manifest.webmanifest](./manifest.webmanifest) | アプリ名・アイコン・起動URL・表示方法 | 新規追加 |
| [icons/](./icons/) | ホーム画面などで使う画像 | 新規追加 |
| [index.html](./index.html) | マニフェスト参照、追加ボタン・ダイアログ配置 | 既存ファイルを変更 |
| [install.js](./install.js) | 端末判定、ボタン表示、インストール確認 | 新規追加 |
| [styles.css](./styles.css) | ボタン・ダイアログ・スマートフォン画面の見た目 | 既存ファイルを変更 |
| [app.js](./app.js) | ゲーム本体 | インストール処理とは分離 |

独自の「＋」ボタンとinstall.jsは利用者を案内するための追加機能です。PWA設定の中心はマニフェストとHTMLからの参照です。

### 1.1 マニフェスト：アプリの設定書

```json
{
  "id": "./",
  "name": "シュナプセン",
  "short_name": "シュナプセン",
  "description": "20枚のカードで遊ぶ、対CPUのシュナプセン。7ゲームポイント先取。",
  "lang": "ja",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f2ebdc",
  "theme_color": "#7a2e22",
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

| 項目 | 意味・今回の設定 |
|---|---|
| id | アプリを識別する値。公開後は不用意に変更しない |
| name | インストール確認などに表示するアプリ名 |
| short_name | 表示領域が狭い場合に使う短い名前 |
| description | アプリの説明 |
| lang | 日本語（ja） |
| start_url | アイコンから起動したときに開くURL |
| scope | アプリ内として扱うURL範囲。アクセス制限ではない |
| display | standalone：対応環境では通常のアドレスバーを表示しない |
| background_color | 起動時の画面などで使われる背景色 |
| theme_color | 対応ブラウザ・OSが周辺UIに使うテーマ色 |
| icons | アイコンの場所・サイズ・形式・用途 |

start_urlとscopeの`./`は、今回の公開先では次のディレクトリを起点にします。

https://gamemasuta.github.io/CardGame_Shnapsen/

background_colorはゲーム画面そのものの背景を変更する設定ではありません。画面はCSSで設定しています。

### 1.2 アイコン画像

| 画像 | サイズ | 用途 |
|---|---|---|
| icon-192.png | 192×192px | インストール用 |
| icon-512.png | 512×512px | 大きな表示・形状加工に対応 |
| apple-touch-icon.png | 180×180px | iPhone・iPadのホーム画面用 |
| favicon-32.png | 32×32px | ブラウザのタブ用。PWA専用ではない |

maskableはOSが丸形などに切り抜いて表示できることを示します。主要な図柄を中央に収め、外周が切り抜かれても欠けにくくしています。

### 1.3 HTMLからの読み込み

index.htmlのheadに以下を追加しています。

```html
<link rel="manifest" href="./manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">
<meta name="theme-color" content="#7a2e22">
<meta name="apple-mobile-web-app-title" content="シュナプセン">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

apple-で始まる項目はApple端末向けの表示を補助する設定です。画面末尾で処理を読み込みます。

```html
<script src="./install.js"></script>
<script src="./app.js"></script>
```

### 1.4 HTTPS配信と実装範囲

公開環境ではHTTPSを使います。localhost・127.0.0.1には開発用の例外がありますが、スマートフォンからPCのLAN内IPアドレスへのHTTP接続は、インストール検証用には使えません。

今回はGitHub Pagesのgh-pagesブランチから公開用ファイルのみを配信しています。mainを更新するだけでは公開サイトに反映されません。

Service Workerは未実装です。インストール可能にすることとオフライン利用は別機能であり、Service Workerはインストールの一律の必須条件ではありません。途中保存も未実装のため、再読み込み・再起動時は新しい試合になります。

参考：[MDN：インストール要件](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

## 2. 右上の「＋」アイコンの挙動

### 2.1 ボタンとダイアログ

```html
<button id="install-button" class="install-button" type="button"
        aria-label="ホーム画面に追加" title="ホーム画面に追加" hidden>
  <!-- 四角と＋を描くSVG -->
</button>
```

- hidden：初期状態では非表示。
- aria-label：画面読み上げ用の説明。
- title：マウスを重ねたときの説明。
- CSS：ヘッダー右上に配置し、操作領域を44×44pxに設定。

確認画面はHTMLのdialog要素です。showModal()で背景操作を遮断して表示し、「閉じる」「キャンセル」、通常はEscキーでも閉じられます。小さい画面ではダイアログ内をスクロールでき、ダークモードにも対応します。

### 2.2 iOS・iPadOSの判定

```js
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
```

前半は端末の識別文字列、後半はMacのような識別情報を返すiPadOSを補足する判定です。将来の識別情報まで保証するものではないため、本番では対象端末・ブラウザを決めて検証します。

### 2.3 ボタンの表示条件

| 状態 | 表示 |
|---|---|
| iOS・iPadOSで通常のブラウザ表示 | 表示 |
| 独立したアプリとして起動中 | 非表示 |
| Android・PCでインストール可能イベントを受信 | 表示 |
| Android・PCで未通知・非対応 | 非表示 |
| 現在のページでインストール承認・完了を検知 | 非表示 |

```js
button.hidden = isInstalled() || (!ios && !pending);
```

pendingは、ブラウザから受け取ったインストール確認用のイベントです。

### 2.4 iOS：手動操作の案内

「＋」を押すと次の手順を表示します。

```text
Safariで開く → 共有ボタン → ホーム画面に追加 → 追加
```

「Webアプリとして開く」がある場合はオンにする案内も含みます。OKボタンは非表示で「閉じる」だけを表示します。アプリから追加を代行せず、利用者がSafariのメニューを操作する方式です。

### 2.5 Android・PC：標準インストール機能の呼び出し

```text
ブラウザがインストール可能と判断
  → beforeinstallpromptを受信
  → イベントを保存し「＋」を表示
  → 利用者が「＋」を押す
  → 独自の「インストールしますか？」を表示
  → OK
  → ブラウザ標準のインストール確認を表示
  → 利用者が最終承認
```

```js
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pending = event;
  installed = false;
  refresh();
});
```

event.preventDefault()は既定の案内を抑制し、独自ボタンから確認画面を開くためにイベントを保存します。OKを押すと次の処理を実行します。

```js
await request.prompt();
const choice = await request.userChoice;
if (choice.outcome === "accepted") installed = true;
```

独自ダイアログのOKだけで無条件にインストールされるわけではありません。ブラウザ標準の画面でも最終承認が必要です。

beforeinstallpromptは全ブラウザ共通ではなく、発生時刻も保証されません。今回は受信後にだけボタンを表示します。

参考：[MDN：beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)

### 2.6 インストール済みの扱いと限界

```js
const isInstalled = () =>
  installed || standalone.matches || navigator.standalone === true;
```

| 判定 | 確認対象 |
|---|---|
| installed | このページ内でインストール承認・完了を検知したか |
| standalone.matches | 現在display-mode: standaloneで動いているか |
| navigator.standalone | Apple端末でホーム画面から起動されているか |

```js
window.addEventListener("appinstalled", () => {
  installed = true;
  pending = null;
  refresh();
});
```

端末全体のインストール済みアプリ一覧を取得しているわけではありません。iPadで追加済みでも通常のSafariでURLを開き直すと案内が再表示される場合があります。Androidでも別ブラウザ・別プロファイルの追加状況まで一律に把握できません。

installedは永続保存しないページ内の変数です。また、利用者の承認時点でもtrueにするため、厳密にはOS側のインストール完了だけを表す変数ではありません。

画面の表示モード変更とpageshowでも表示条件を再評価します。インストール済みと判定した場合は、開いている追加ダイアログも閉じます。

### 2.7 取消・連打・失敗への対応

| 操作・状態 | 処理 |
|---|---|
| 独自ダイアログでキャンセル | 閉じる。再度＋から操作可能 |
| ブラウザ標準画面でキャンセル | 使用したイベントを破棄。新しいイベント受信まで非表示 |
| OKの連打 | busyとボタン無効化で二重実行を防止 |
| インストール開始に失敗 | 再読み込み・ブラウザメニューからの操作を案内 |
| ダイアログ内のEnter・Space | ゲーム側の得点ダイアログへ伝播しないよう制御 |

独自ダイアログでの取消と、ブラウザ標準画面での取消では再表示条件が異なります。

## 3. 委託先へ渡す仕様に含めたい事項

| 項目 | 決める内容 |
|---|---|
| 対応環境 | Android Chrome、iPhone・iPad Safari、PC Chromeなど |
| アプリ情報 | 正式名、短縮名、アイコン、起動URL、識別子 |
| 表示条件 | インストール可能時だけ表示するか、非対応でも案内を出すか |
| iOS案内 | Safari手順、追加済みでも案内が出る場合の扱い |
| PC案内 | インストール後の起動場所、MacのDock追加方法など |
| 追加済み判定 | ブラウザから取得できる範囲での判定であること |
| キャンセル後 | 再表示条件と代替の操作方法 |
| 追加機能 | オフライン、途中保存、ログイン保持、通知の有無 |

## 4. 検証方法

[test-install.js](./test-install.js)で端末判定、取消、承認、独立起動、エラー分岐をモック検証しています。

```sh
node --check install.js
node test-install.js
node test.js
```

実機の受入試験では以下を確認します。

1. 未インストール時のボタン表示・案内。
2. 新規インストールとアイコンからの起動。
3. インストール後にブラウザで再訪した場合の表示。
4. 独自ダイアログとブラウザ標準画面でそれぞれ取消。
5. アンインストール後の再追加。
6. PCでの起動場所と、対象OS・ブラウザでの表示差。

今回の利用者確認ではAndroidは仕様どおりの動作、Mac Chromeはインストール・アプリ起動、iPadは追加手順ダイアログの表示が確認されています。iPadの実際のホーム画面追加と追加後の起動は、この資料では確認済みとは扱いません。

## 5. 公開運用

- 公開URL：https://gamemasuta.github.io/CardGame_Shnapsen/
- GitHubのSettings → Pagesで公開設定・URLを確認。
- 配信元はgh-pagesブランチのルート。
- mainは開発用。公開にはgh-pagesにも配信用ファイルを反映。
- pages-workflow.example.ymlは将来の自動公開用の参考で、現在は実行しない。
- 本資料・テスト・引継書はゲーム配信には不要。
