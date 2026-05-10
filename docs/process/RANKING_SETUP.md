# Ranking Backend Setup (Google Apps Script)

MyCryptoSurvivor のランキングは **Google Apps Script (GAS) Web App + Google Spreadsheet** をサーバーレスバックエンドとして使う。 完全無料、 個人プロジェクト用途。

## 1. 全体構成

```
[ブラウザ]                        [Google Apps Script]      [Google Spreadsheet]
js/ranking-client.js   ──POST──▶  doPost(JSON body)   ───▶  ranking シートに追記
                       ──GET───▶  doGet(?limit=20)    ◀───  読み出し + score DESC + slice
                       ◀──JSON─
```

- フロントは `js/ranking-client.js` の `submitScore` / `fetchRanking`
- API URL は `localStorage["mcs.rankingApiUrl"]`、 または `js/ranking-client.js` の `_DEFAULT_API_URL_ENC` にビルトイン (= base64)
- サーバースクリプトは `tools/gas-ranking.gs`

## 2. デプロイ手順 (= 5 分)

### 2.1 Spreadsheet を作る

1. [Google ドライブ](https://drive.google.com/) で新規 Google Spreadsheet を作成
2. 名前は何でも (例: `MyCryptoSurvivor Ranking`)
3. シートは初期 1 枚のままで OK (= スクリプトが自動で `ranking` シートを足す)

### 2.2 Apps Script に貼り付け

1. Spreadsheet メニュー: **拡張機能 → Apps Script**
2. 開いたエディタで `Code.gs` の中身を全削除
3. リポジトリの **`tools/gas-ranking.gs`** を全文コピー → エディタに貼り付け
4. 保存 (Ctrl+S / Cmd+S)、 プロジェクト名は `MCS Ranking` などに変更しておくと整理しやすい

### 2.3 Web App としてデプロイ

1. 右上の **デプロイ** → **新しいデプロイ**
2. 種類: **ウェブアプリ**
3. 設定:
   - 説明: `MCS ranking v1` (任意)
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員** (= 匿名アクセス許可)
4. **デプロイ** ボタン → 初回は権限承認ダイアログ (= スクリプトに Spreadsheet 編集権を付与)
5. 表示される **ウェブアプリの URL** をコピー
   - 形式: `https://script.google.com/macros/s/AKfycb.../exec`

### 2.4 動作確認

ブラウザで `{URL}?limit=5` を開く → `{"ok":true,"ranking":[]}` が返れば成功。

## 3. ゲームに URL を設定

3 通り:

### A. localStorage (= 個別端末で設定)

DevTools コンソールで:

```js
localStorage.setItem("mcs.rankingApiUrl", "https://script.google.com/macros/s/AKfycb.../exec");
location.reload();
```

または **タイトル画面のランキングボタン** から開いた modal で URL 未設定なら入力欄が出るので、 そこに貼って 「保存」。

### B. URL hash bootstrap (= 共有しやすい一回限定リンク)

訪問者に下記のような hash 付き URL を踏ませると、 自動で localStorage に保存されて以降同じ URL をハードコードしたかのように使える。

```
https://your-site/?#api=BASE64ENCODED_API_URL
```

`BASE64ENCODED_API_URL` は `btoa(URL)` の出力。 1 回踏めば以降は不要。

### C. ビルトイン (= リポジトリにハードコード)

`js/ranking-client.js` の `_DEFAULT_API_URL_ENC` に `btoa(URL)` の値をセットしてコミット。 これで **誰でも同じバックエンドに記録される共通ランキング** になる。

```js
// 例 (= 値はダミー)
const _DEFAULT_API_URL_ENC = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3MvLi4uL2V4ZWM=";
```

⚠ ビルトインすると **誰でも POST 可能** になる (= API URL が公知)。 適切な制限を入れたい場合は 5 章参照。

## 4. シートのデータ構造

`ranking` シートのヘッダー行 (= 1 行目):

| timestamp | playerName | score | level | kills | hero | faction | version | elapsedSec |

各行が 1 ラン。 score 降順で取れば上位ランキングになる。

| 列 | 例 | 型 |
|---|---|---|
| timestamp | `2026-05-10T12:34:56.789Z` | ISO 8601 文字列 |
| playerName | `bearko` | 文字列 (= max 30 chars 切詰めはクライアント側) |
| score | `12345` | 整数 |
| level | `27` | 整数 |
| kills | `412` | 整数 |
| hero | `コナン・ドイル` | 文字列 |
| faction | `SEIRYU` / `SUZAKU` ... | 文字列 |
| version | `0.1.0` | 文字列 |
| elapsedSec | `412` | 整数 |

## 5. 不正対策 (= 任意、 後段)

匿名 POST 可能なので必要に応じて追加:

- **score 上限**: `if (score > 1_000_000) reject` を doPost に追加
- **rate limit**: PropertiesService に `lastPostMs[ip]` を保存して 5 sec throttle (※ GAS は IP を直接取得できないので簡易 token を使う等)
- **HMAC**: クライアントに `secret` を持たせ、 `hash = HMAC(secret, JSON.stringify(payload))` を送って検証 (= 静的サイトには secret を埋めにくいので obfuscation 程度の効果)

個人プロジェクトでは **score 上限のみ** で運用するのが現実的。

## 6. 再デプロイ時の注意

GAS は **新しいデプロイ** を作ると **新しい URL** が発行される。 既存 URL を維持したい場合は:

- 右上の **デプロイ** → 既存デプロイを編集 (= バージョンを進める) → 同じ URL を保持

## 7. ローカル開発時のテスト

GAS にデプロイせず本物のレスポンスをモックしたい場合:

```sh
# 仮想 endpoint (= 適当な GET/POST mock)
python3 -m http.server 8080
```

ローカル `http://localhost:8080` を `mcs.rankingApiUrl` に設定すると `submitScore` の挙動 (= ボタン disabled / 送信中 / submitOk) は確認できる。 GET レスポンスは別途 mock する必要あり。

## 8. 削除 / リセット

ランキングを全消ししたい時:
- Spreadsheet を直接開いて `ranking` シートをクリア (= ヘッダー行は残す)
- もしくは GAS エディタから `_getOrCreateSheet().clearContents(); _getOrCreateSheet().appendRow(HEADERS);` を 1 度実行

## 9. 参考リンク

- Apps Script Web App: <https://developers.google.com/apps-script/guides/web>
- ContentService API: <https://developers.google.com/apps-script/reference/content/content-service>
- 既存実装: `js/ranking-client.js` (= submit/fetch のクライアント)
