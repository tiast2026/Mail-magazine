// ==UserScript==
// @name         楽天R-Mail 実績取り込み (Mail-magazine)
// @namespace    https://mail-magazine.vercel.app/
// @version      0.1.0
// @description  楽天 R-Mail の実績ページから開封率・送客数・売上などを抽出し、Mail-magazine の outputs.json に取り込みます
// @author       Mail-magazine
// @match        https://*.rakuten.co.jp/*rmail*
// @match        https://*.rakuten.co.jp/*r-mail*
// @match        https://rms.rakuten.co.jp/*
// @match        https://*.rms.rakuten.co.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      mail-magazine.vercel.app
// @connect      vercel.app
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // 設定
  // ------------------------------------------------------------------
  const DEFAULT_ENDPOINT =
    "https://mail-magazine.vercel.app/api/results/import";

  function getEndpoint() {
    return GM_getValue("endpoint", DEFAULT_ENDPOINT);
  }
  function getToken() {
    return GM_getValue("token", "");
  }
  function getBrandId() {
    return GM_getValue("brandId", "noahl");
  }

  // ------------------------------------------------------------------
  // スクレイパー
  // ------------------------------------------------------------------
  /** 「ラベル文字列」から最も近い数値ノードを探す汎用関数 */
  function findValueNearLabel(label, opts = {}) {
    const { all = false } = opts;
    const xpath = `//*[normalize-space(text())="${label}"]`;
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    const nodes = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      nodes.push(result.snapshotItem(i));
    }
    if (!nodes.length) return all ? [] : null;

    const collected = [];
    for (const labelNode of nodes) {
      // 兄弟・親要素の中から数値らしいテキストを探す
      const candidates = [];
      const parent = labelNode.parentElement;
      if (parent) {
        candidates.push(...Array.from(parent.children));
        if (parent.parentElement) {
          candidates.push(...Array.from(parent.parentElement.children));
        }
      }
      for (const c of candidates) {
        if (c === labelNode) continue;
        const text = (c.textContent || "").trim();
        if (!text) continue;
        if (text === label) continue;
        const num = parseNumber(text);
        if (num !== null) {
          collected.push({ raw: text, num, node: c });
          break;
        }
      }
    }
    if (all) return collected;
    return collected[0] ?? null;
  }

  function parseNumber(text) {
    if (!text) return null;
    // "28.1%" "488" "(3,693)" "¥14,950" "+ 1.2 pt ▲" "-20.8 pt ▼" "0.7%" などに対応
    const cleaned = text
      .replace(/[¥￥,()（）]/g, "")
      .replace(/\s+/g, "")
      .replace(/▲|▼/g, "")
      .replace(/pt$/i, "")
      .replace(/[%％]$/, "")
      .replace(/件$|通$|円$/g, "");
    const m = cleaned.match(/^[+-]?\d+(\.\d+)?$/);
    if (!m) return null;
    return parseFloat(cleaned);
  }

  /** ページから ID と件名と配信日を抜き出す（ヘッダ部の表形式） */
  function extractHeader() {
    const out = {};
    // メルマガID
    const idLabel = findValueNearLabel("ID");
    if (idLabel) out.mailId = String(Math.trunc(idLabel.num));
    // 件名・サブジェクト
    const subjLabel = findValueNearLabel("サブジェクト（件名）");
    // ↑数値ではないので findValueNearLabel は機能しない、別ロジック
    out.subject = extractTextNearLabel("サブジェクト（件名）");
    // ページタイトル先頭からも拾う（例: "26431856:【ALL50%OFF】..."）
    if (!out.subject) {
      const h1 = document.querySelector("h1, h2, .title, [class*=Title]");
      if (h1) {
        const t = (h1.textContent || "").trim();
        const m = t.match(/^\s*\d+\s*[:：]\s*(.+)$/);
        if (m) out.subject = m[1].trim();
      }
    }
    out.sentStartAt = extractTextNearLabel("送信開始日時") || extractTextNearLabel("送信開始日");
    out.sentEndAt = extractTextNearLabel("送信完了日時");
    out.aggregateFrom = extractDateRange().from;
    out.aggregateTo = extractDateRange().to;
    return out;
  }

  function extractTextNearLabel(label) {
    const xpath = `//*[normalize-space(text())="${label}"]`;
    const r = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    const node = r.singleNodeValue;
    if (!node) return null;
    const parent = node.parentElement;
    if (!parent) return null;
    // 兄弟 td / 次の dd / 隣接セルから値を取得
    const siblings = Array.from(parent.children).filter((c) => c !== node);
    for (const s of siblings) {
      const t = (s.textContent || "").trim();
      if (t && t !== label) return t;
    }
    // 親の親で次のセル
    if (parent.parentElement) {
      const cells = Array.from(parent.parentElement.children);
      const idx = cells.indexOf(parent);
      if (idx >= 0 && cells[idx + 1]) {
        const t = (cells[idx + 1].textContent || "").trim();
        if (t) return t;
      }
    }
    return null;
  }

  function extractDateRange() {
    const text = document.body.innerText;
    const m = text.match(/集計期間[:：]?\s*(\d{4}\/\d{1,2}\/\d{1,2})\s*[〜~～-]\s*(\d{4}\/\d{1,2}\/\d{1,2})/);
    if (!m) return { from: null, to: null };
    return {
      from: m[1].replace(/\//g, "-"),
      to: m[2].replace(/\//g, "-"),
    };
  }

  function extractMainMetrics() {
    const out = {};
    const sent = findValueNearLabel("送信数");
    if (sent) out.sentCount = sent.num;

    const openRate = findValueNearLabel("開封率");
    if (openRate) out.openRate = openRate.num;
    const openCount = findValueNearLabel("開封数");
    if (openCount) out.openCount = openCount.num;
    // 開封数（カッコつき表記）の場合
    if (!out.openCount) {
      const openSection = findValueNearLabel("（開封数）");
      if (openSection) out.openCount = openSection.num;
    }

    const clicks = findValueNearLabel("クリック数");
    if (clicks) out.clickCount = clicks.num;

    const conversionVisitRate = findValueNearLabel("送客率");
    if (conversionVisitRate) out.conversionVisitRate = conversionVisitRate.num;
    const conversionVisitCount = findValueNearLabel("送客数");
    if (conversionVisitCount)
      out.conversionVisitCount = conversionVisitCount.num;

    const favoriteRate = findValueNearLabel("お気に入り登録率");
    if (favoriteRate) out.favoriteRate = favoriteRate.num;
    const favoriteCount = findValueNearLabel("お気に入り登録数");
    if (favoriteCount) out.favoriteCount = favoriteCount.num;

    const txRate = findValueNearLabel("転換率");
    if (txRate) out.transactionRate = txRate.num;
    const txCount = findValueNearLabel("転換数");
    if (txCount) out.transactionCount = txCount.num;

    const revenue = findValueNearLabel("売上");
    if (revenue) out.revenue = revenue.num;
    const revPerSent = findValueNearLabel("売上/通");
    if (revPerSent) out.revenuePerSent = revPerSent.num;

    // 前月比
    const diffs = document.body.innerText.match(/前月比[\s\S]*?([+-]?\d+(?:\.\d+)?)\s*pt/g);
    if (diffs && diffs.length) {
      const nums = diffs
        .map((s) => s.match(/([+-]?\d+(?:\.\d+)?)\s*pt/))
        .filter(Boolean)
        .map((m) => parseFloat(m[1]));
      if (nums[0] !== undefined) out.openRateDiffPt = nums[0];
      if (nums[1] !== undefined) out.conversionVisitRateDiffPt = nums[1];
    }

    return out;
  }

  /** デバイス別 開封・送客テーブルを抽出 */
  function extractDeviceBreakdown() {
    const tables = Array.from(document.querySelectorAll("table"));
    const result = [];
    for (const tbl of tables) {
      const headText = (tbl.tHead?.innerText || "").trim();
      const firstRowText = (tbl.rows[0]?.innerText || "").trim();
      const head = headText || firstRowText;
      if (!/(送客デバイス|転換デバイス|デバイス)/.test(head)) continue;
      if (!/(送客率|開封率|転換率|お気に入り登録率)/.test(head)) continue;

      const rows = Array.from(tbl.rows).slice(1);
      const headerCells = Array.from(
        (tbl.tHead?.rows[0] || tbl.rows[0]).cells,
      ).map((c) => (c.textContent || "").trim());

      for (const row of rows) {
        const cells = Array.from(row.cells).map((c) =>
          (c.textContent || "").trim(),
        );
        if (!cells.length) continue;
        const device = mapDevice(cells[0]);
        if (!device) continue;
        const m = { device };
        headerCells.forEach((h, i) => {
          const key = mapHeaderToKey(h);
          if (!key) return;
          const num = parseNumber(cells[i] || "");
          if (num !== null) m[key] = num;
        });
        const exists = result.find((r) => r.device === device);
        if (exists) Object.assign(exists, m);
        else result.push(m);
      }
    }
    return result;
  }

  function mapDevice(label) {
    const t = label.replace(/\s/g, "");
    if (/^PC/.test(t)) return "pc";
    if (/スマートフォン/.test(t) || /^SP/.test(t)) return "smartphone";
    if (/タブレット/.test(t)) return "tablet";
    if (/アプリ/.test(t)) return "app";
    if (/合計/.test(t)) return "total";
    return null;
  }

  function mapHeaderToKey(h) {
    const t = h.replace(/\s/g, "");
    if (/開封数/.test(t)) return "opens";
    if (/開封率/.test(t)) return "openRate";
    if (/クリック数/.test(t)) return "clicks";
    if (/送客率/.test(t)) return "sendRate";
    if (/送客数/.test(t)) return "sent";
    if (/お気に入り登録数/.test(t)) return "favorites";
    if (/お気に入り登録率/.test(t)) return "favoriteRate";
    if (/転換数/.test(t)) return "conversions";
    if (/転換率/.test(t)) return "conversionRate";
    if (/売上/.test(t)) return "revenue";
    return null;
  }

  /** 日別推移テーブル（「推移データを表示」が展開されている前提） */
  function extractDailyTrend() {
    const tables = Array.from(document.querySelectorAll("table"));
    for (const tbl of tables) {
      const head = (tbl.tHead?.innerText || tbl.rows[0]?.innerText || "")
        .trim();
      if (!/日付|日別/.test(head)) continue;
      const headerCells = Array.from(
        (tbl.tHead?.rows[0] || tbl.rows[0]).cells,
      ).map((c) => (c.textContent || "").trim());
      const dateIdx = headerCells.findIndex((h) => /日付|日別/.test(h));
      if (dateIdx < 0) continue;
      const trend = [];
      for (const row of Array.from(tbl.rows).slice(1)) {
        const cells = Array.from(row.cells).map((c) =>
          (c.textContent || "").trim(),
        );
        const dateText = cells[dateIdx];
        const dm = dateText && dateText.match(/(\d{2,4})\/(\d{1,2})\/(\d{1,2})|(\d{1,2})\/(\d{1,2})/);
        if (!dm) continue;
        const date = dm[1]
          ? `${dm[1].length === 2 ? "20" + dm[1] : dm[1]}-${pad(dm[2])}-${pad(dm[3])}`
          : null;
        if (!date) continue;
        const e = { date };
        headerCells.forEach((h, i) => {
          const key = /開封/.test(h)
            ? "opens"
            : /送客/.test(h)
              ? "sends"
              : /転換/.test(h)
                ? "conversions"
                : null;
          if (!key) return;
          const num = parseNumber(cells[i] || "");
          if (num !== null) e[key] = num;
        });
        trend.push(e);
      }
      if (trend.length) return trend;
    }
    return [];
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function buildPayload() {
    const header = extractHeader();
    const main = extractMainMetrics();
    const deviceBreakdown = extractDeviceBreakdown();
    const dailyTrend = extractDailyTrend();

    const sentDate =
      (header.sentStartAt && parseSentDate(header.sentStartAt)) ||
      (header.aggregateFrom ?? null);

    return {
      brandId: getBrandId(),
      rakutenMailId: header.mailId,
      subject: header.subject,
      sentDate,
      results: {
        sentCount: main.sentCount,
        openRate: main.openRate,
        openCount: main.openCount,
        clickCount: main.clickCount,
        salesCount: main.transactionCount,
        salesAmount: main.revenue,
      },
      rakuten: {
        mailId: header.mailId,
        subject: header.subject,
        sentStartAt: parseDateTime(header.sentStartAt),
        sentEndAt: parseDateTime(header.sentEndAt),
        aggregateFrom: header.aggregateFrom,
        aggregateTo: header.aggregateTo,
        conversionVisitRate: main.conversionVisitRate,
        conversionVisitCount: main.conversionVisitCount,
        openRateDiffPt: main.openRateDiffPt,
        conversionVisitRateDiffPt: main.conversionVisitRateDiffPt,
        favoriteCount: main.favoriteCount,
        favoriteRate: main.favoriteRate,
        transactionCount: main.transactionCount,
        transactionRate: main.transactionRate,
        revenuePerSent: main.revenuePerSent,
        deviceBreakdown,
        dailyTrend,
        sourceUrl: location.href,
      },
    };
  }

  function parseSentDate(text) {
    if (!text) return null;
    const m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!m) return null;
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  }
  function parseDateTime(text) {
    if (!text) return null;
    const m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return parseSentDate(text);
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}:${m[6] ?? "00"}+09:00`;
  }

  // ------------------------------------------------------------------
  // 送信
  // ------------------------------------------------------------------
  function send(payload, dryRun) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: getEndpoint(),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        data: JSON.stringify({ ...payload, dryRun: !!dryRun }),
        onload: (r) => {
          try {
            const json = JSON.parse(r.responseText || "{}");
            if (r.status >= 200 && r.status < 300) resolve(json);
            else reject(json);
          } catch {
            reject({ status: r.status, body: r.responseText });
          }
        },
        onerror: (e) => reject(e),
      });
    });
  }

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  GM_addStyle(`
    #mm-import-panel {
      position: fixed; right: 16px; bottom: 16px; z-index: 999999;
      font-family: -apple-system, "Hiragino Sans", sans-serif;
      width: 320px; background: #fff; border: 1px solid #ccc;
      border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.15);
      font-size: 12px;
    }
    #mm-import-panel header {
      padding: 8px 12px; background: #8c7b6b; color: #fff;
      border-radius: 8px 8px 0 0; display: flex; justify-content: space-between;
      align-items: center; cursor: move;
    }
    #mm-import-panel .body { padding: 10px 12px; }
    #mm-import-panel button {
      cursor: pointer; padding: 6px 10px; border-radius: 4px;
      border: 1px solid #ccc; background: #f7f5f1; margin-right: 4px;
    }
    #mm-import-panel button.primary { background: #8c7b6b; color: #fff; border-color: #8c7b6b; }
    #mm-import-panel input { width: 100%; padding: 4px 6px; font-size: 11px; box-sizing: border-box; margin-top: 2px; }
    #mm-import-panel pre { background: #f4f1ec; padding: 6px; border-radius: 4px; max-height: 200px; overflow: auto; font-size: 10px; }
    #mm-import-panel .row { margin-bottom: 6px; }
    #mm-import-panel .log { color: #555; }
    #mm-import-panel .ok { color: #2e7d32; }
    #mm-import-panel .err { color: #c62828; }
  `);

  function mountUI() {
    if (document.getElementById("mm-import-panel")) return;
    const root = document.createElement("div");
    root.id = "mm-import-panel";
    root.innerHTML = `
      <header>
        <span>📨 Mail-magazine 取り込み</span>
        <span style="cursor:pointer" data-act="toggle">_</span>
      </header>
      <div class="body">
        <div class="row">
          <button class="primary" data-act="dry">プレビュー</button>
          <button data-act="send">取り込み実行</button>
          <button data-act="settings">⚙</button>
        </div>
        <div class="log" data-log></div>
        <div class="settings" style="display:none">
          <div class="row">
            <label>API エンドポイント</label>
            <input data-field="endpoint" value="${escapeAttr(getEndpoint())}">
          </div>
          <div class="row">
            <label>Ingest トークン</label>
            <input data-field="token" type="password" value="${escapeAttr(getToken())}">
          </div>
          <div class="row">
            <label>ブランド ID</label>
            <input data-field="brandId" value="${escapeAttr(getBrandId())}">
          </div>
          <button data-act="save">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const log = (html, cls = "") => {
      const el = root.querySelector("[data-log]");
      el.innerHTML = `<span class="${cls}">${html}</span>`;
    };

    root.addEventListener("click", async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const act = t.getAttribute("data-act");
      if (!act) return;
      if (act === "settings") {
        const s = root.querySelector(".settings");
        s.style.display = s.style.display === "none" ? "block" : "none";
      }
      if (act === "save") {
        const ep = root.querySelector('[data-field="endpoint"]').value.trim();
        const tk = root.querySelector('[data-field="token"]').value.trim();
        const br = root.querySelector('[data-field="brandId"]').value.trim();
        GM_setValue("endpoint", ep || DEFAULT_ENDPOINT);
        GM_setValue("token", tk);
        GM_setValue("brandId", br || "noahl");
        log("設定を保存しました", "ok");
      }
      if (act === "dry" || act === "send") {
        try {
          const payload = buildPayload();
          if (!payload.rakutenMailId && !payload.subject) {
            log("ID も件名も取得できませんでした。ページを確認してください", "err");
            return;
          }
          log(
            `${act === "dry" ? "プレビュー中..." : "送信中..."} (mailId=${payload.rakutenMailId ?? "?"})`,
          );
          const res = await send(payload, act === "dry");
          if (act === "dry") {
            log(
              `マッチ: ${res.matched?.title ?? "?"} (${res.matched?.reason ?? "?"})<br><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`,
              "ok",
            );
          } else {
            log(
              `取り込み完了: ${res.matched?.title ?? "?"} (${res.matched?.reason ?? "?"})`,
              "ok",
            );
          }
        } catch (err) {
          log(
            `失敗: ${escapeHtml(JSON.stringify(err))}`,
            "err",
          );
        }
      }
      if (act === "toggle") {
        const body = root.querySelector(".body");
        body.style.display = body.style.display === "none" ? "block" : "none";
      }
    });
  }

  function escapeAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ------------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountUI);
  } else {
    mountUI();
  }
  // SPA 対応で 1.5 秒後に再マウントを試みる
  setTimeout(mountUI, 1500);
})();
