// ============================================================
// gas-ranking.gs — MyCryptoSurvivor ranking endpoint (Google Apps Script Web App)
// ============================================================
//
// 1) Google Spreadsheet を新規作成 (= 名前は何でも OK、 例: "MyCryptoSurvivor Ranking")
// 2) [拡張機能] → [Apps Script] でこのファイル全文を貼り付け、 保存
// 3) [デプロイ] → [新しいデプロイ] → [種類: ウェブアプリ]
//      - 説明: "MCS ranking v1"
//      - 次のユーザーとして実行: 自分
//      - アクセスできるユーザー: **全員 (= 匿名アクセス許可)**
// 4) 「ウェブアプリの URL」 をコピー → ゲーム側で localStorage.setItem("mcs.rankingApiUrl", URL)
//    あるいは js/ranking-client.js の `_DEFAULT_API_URL_ENC` に btoa(URL) をセットしてコミット
// 5) ブラウザで {URL}?limit=5 を開いて `{ "ok": true, "ranking": [] }` が返れば OK
//
// ⚠ 「全員」 アクセスにすると **誰でも GET / POST 可能** になる。 個人プロジェクトの想定。
// ⚠ 不正対策が必要なら GAS 側で score 上限 / IP rate limit を別途追加。

const SHEET_NAME = "ranking";
const HEADERS = [
  "timestamp", "playerName", "score",
  "level", "kills", "hero", "faction", "version", "elapsedSec",
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (!body || typeof body.score !== "number") {
      return _json({ ok: false, error: "invalid payload" });
    }
    const sheet = _getOrCreateSheet();
    const row = HEADERS.map(h => h === "timestamp" ? (body.timestamp || new Date().toISOString()) : (body[h] != null ? body[h] : ""));
    sheet.appendRow(row);
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet(e) {
  try {
    const params  = (e && e.parameter) || {};
    const limit   = Math.min(parseInt(params.limit || "20", 10) || 20, 100);
    const version = params.version || null;
    const sheet   = _getOrCreateSheet();
    const data    = sheet.getDataRange().getValues();
    if (data.length < 2) return _json({ ok: true, ranking: [] });

    // ヘッダー行から index map (= 並び替えがあっても堅牢に)
    const idx = {};
    const headerRow = data[0];
    HEADERS.forEach(h => {
      const i = headerRow.indexOf(h);
      idx[h] = i >= 0 ? i : -1;
    });

    const rows = data.slice(1)
      .map(r => ({
        timestamp:  _str(r[idx.timestamp]),
        playerName: _str(r[idx.playerName]),
        score:      Number(r[idx.score]) || 0,
        level:      Number(r[idx.level]) || 0,
        kills:      Number(r[idx.kills]) || 0,
        hero:       _str(r[idx.hero]),
        faction:    _str(r[idx.faction]),
        version:    _str(r[idx.version]),
        elapsedSec: Number(r[idx.elapsedSec]) || 0,
      }))
      .filter(r => !version || r.version === version)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return _json({ ok: true, ranking: rows });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err), ranking: [] });
  }
}

function _getOrCreateSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
  }
  return sh;
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _str(v) { return v == null ? "" : String(v); }
