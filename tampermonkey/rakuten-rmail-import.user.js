// ==UserScript==
// @name         楽天R-Mail 実績取り込み (Mail-magazine)
// @namespace    https://mail-magazine.vercel.app/
// @version      0.2.0
// @description  楽天 R-Mail (Angular SPA) の実績ページから開封率・送客数・売上などを抽出し、Mail-magazine の outputs.json に取り込みます
// @author       Mail-magazine
// @match        https://rmail.rms.rakuten.co.jp/*
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

  const getEndpoint = () => GM_getValue("endpoint", DEFAULT_ENDPOINT);
  const getToken = () => GM_getValue("token", "");
  const getBrandId = () => GM_getValue("brandId", "noahl");

  // ------------------------------------------------------------------
  // ユーティリティ
  // ------------------------------------------------------------------
  const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const pad = (n) => String(n).padStart(2, "0");

  /** "28.1%" "3,358" "¥14,950" "¥1.1" "-20.8" などを number に */
  function parseNumber(t) {
    if (t == null) return null;
    const s = String(t)
      .replace(/[¥￥,()（）]/g, "")
      .replace(/\s+/g, "")
      .replace(/▲|▼/g, "")
      .replace(/pt$/i, "")
      .replace(/[%％]$/, "")
      .replace(/件$|通$|円$/g, "");
    const m = s.match(/^[+-]?\d+(\.\d+)?$/);
    return m ? parseFloat(s) : null;
  }

  /** 「(48.9%)」のような括弧つき値を取り出す */
  function parseInnerNumber(t) {
    if (!t) return null;
    const m = String(t).match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  // ------------------------------------------------------------------
  // ページ判定
  // ------------------------------------------------------------------
  function getMailIdFromHash() {
    const m = location.hash.match(/^#\/performance\/(\d+)/);
    return m ? m[1] : null;
  }
  const isPerformancePage = () => !!getMailIdFromHash();

  // ------------------------------------------------------------------
  // ヘッダ抽出
  // ------------------------------------------------------------------
  function extractHeader() {
    const out = {};
    out.mailId = getMailIdFromHash();

    const t1 = document.querySelector("table.type1.table01");
    if (t1) {
      const cells = t1.querySelectorAll("tbody tr td");
      if (cells.length >= 4) {
        out.id = text(cells[0]);
        out.sentDateRaw = text(cells[1]); // 例: 2026/04/29
        out.subject = text(cells[2]);
        out.mailType = text(cells[3]);
      }
    }

    const t2 = document.querySelector("table.type1.table02");
    if (t2) {
      const dataRow = t2.querySelectorAll("tbody tr")[1];
      if (dataRow) {
        const cells = dataRow.querySelectorAll("td");
        if (cells.length >= 4) {
          out.sentCount = parseNumber(text(cells[0]));
          out.listCondition = text(cells[1]);
          out.sentStartAtRaw = text(cells[2]);
          out.sentEndAtRaw = text(cells[3]);
        }
      }
    }

    const dateWrap = document.querySelector("p.dateWrapper > span");
    if (dateWrap) {
      const m = text(dateWrap).match(
        /(\d{4})\/(\d{1,2})\/(\d{1,2})\s*[〜~～]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      );
      if (m) {
        out.aggregateFrom = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
        out.aggregateTo = `${m[4]}-${pad(m[5])}-${pad(m[6])}`;
      }
    }

    return out;
  }

  function toIsoDate(s) {
    if (!s) return null;
    const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null;
  }
  function toIsoDateTime(s) {
    if (!s) return null;
    const m = s.match(
      /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    );
    if (!m) return toIsoDate(s);
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}:${m[6] ?? "00"}+09:00`;
  }

  // ------------------------------------------------------------------
  // メインカード（開封率 / 送客率）
  // ------------------------------------------------------------------
  function extractMainCard(selector) {
    const card = document.querySelector(selector);
    if (!card) return null;
    const cur = card.querySelector(".statsBlockPart.current");
    const mon = card.querySelector(".statsBlockPart.month");

    const percentP = cur?.querySelector("p.percent");
    const countStrong = cur?.querySelector("p strong");
    const diffP = mon?.querySelector("p.pointRes");
    const lastMonthP = mon
      ? Array.from(mon.querySelectorAll("p")).find(
          (p) =>
            !p.classList.contains("subTtl") &&
            !p.classList.contains("pointRes"),
        )
      : null;

    return {
      rate: parseNumber(text(percentP)),
      count: parseNumber(text(countStrong)),
      diffPt: parseNumber(text(diffP)),
      diffSign: diffP?.classList.contains("negatifRes")
        ? "neg"
        : diffP?.classList.contains("positifRes")
          ? "pos"
          : null,
      lastMonthRate: parseInnerNumber(text(lastMonthP)),
    };
  }

  // ------------------------------------------------------------------
  // mini stats（クリック数・お気に入り・転換・売上・売上/通）
  // ------------------------------------------------------------------
  function extractMiniStats() {
    const out = {};
    const cards = document.querySelectorAll("div.miniStatsBlock");
    cards.forEach((card) => {
      // ラベルは miniStatsBlock 直下の最初の <p>
      const labelP = card.querySelector(":scope > p");
      const label = text(labelP);
      const resNum = card.querySelector("div.resNum");
      if (!label || !resNum) return;

      const ps = resNum.querySelectorAll("p");
      // ps[0]: 主数値 (例 "488" / "17" / "5" / "¥14,950" / "¥1.1")
      // ps[1]: span.smallRes 内に "(5.7%)" など。無いケースもある
      const main = parseNumber(text(ps[0]));
      const small = ps[1]
        ? parseInnerNumber(text(ps[1].querySelector("span.smallRes") || ps[1]))
        : null;

      const key = label.replace(/\s+/g, "");
      if (key.startsWith("クリック数")) {
        out.clickCount = main;
      } else if (key.startsWith("お気に入り登録率")) {
        // ラベル「お気に入り登録率」だが主数値は登録"数"、括弧内が率
        out.favoriteCount = main;
        out.favoriteRate = small;
      } else if (key.startsWith("転換数（転換率）")) {
        out.transactionCount = main;
        out.transactionRate = small;
      } else if (key === "売上") {
        out.revenue = main;
      } else if (key === "売上/通") {
        out.revenuePerSent = main;
      }
    });
    return out;
  }

  // ------------------------------------------------------------------
  // デバイス別テーブル
  // ------------------------------------------------------------------
  function findTableAfterHeading(headingText) {
    const headings = document.querySelectorAll("h3.partSubtitle");
    for (const h of headings) {
      if (text(h).replace(/\s+/g, "") === headingText.replace(/\s+/g, "")) {
        // 次の table.type2 を兄弟方向から探す
        let sib = h.nextElementSibling;
        while (sib) {
          if (sib.matches?.("table.type2")) return sib;
          const inner = sib.querySelector?.("table.type2");
          if (inner) return inner;
          sib = sib.nextElementSibling;
        }
        // 親まで上がって探す
        const parent = h.parentElement;
        if (parent) return parent.querySelector("table.type2");
      }
    }
    return null;
  }

  /** type2 の thead は 2 行構造。row1 が colspan/rowspan 付き、row2 が leaf 列名 */
  function readType2Headers(table) {
    const rows = table.querySelectorAll("thead tr");
    if (rows.length === 0) return [];
    const row2 = rows[1];
    if (!row2) {
      return Array.from(rows[0].querySelectorAll("th")).map((th) => text(th));
    }
    return Array.from(row2.querySelectorAll("th")).map((th) => text(th));
  }

  function extractDeviceSoukyaku() {
    const tbl = findTableAfterHeading("デバイス別送客");
    if (!tbl) return [];
    const rows = tbl.querySelectorAll("tbody tr");
    const result = [];
    rows.forEach((row) => {
      const th = row.querySelector("th");
      const tds = row.querySelectorAll("td");
      const deviceLabel = text(th);
      const device = mapDevice(deviceLabel);
      if (!device) return;
      // 列順（recon 結果より）: 開封数, 開封率, クリック数, 送客数, 送客率
      const m = { device };
      m.opens = parseNumber(text(tds[0]));
      m.openRate = parseNumber(text(tds[1]));
      m.clicks = parseNumber(text(tds[2]));
      m.sent = parseNumber(text(tds[3]));
      m.sendRate = parseNumber(text(tds[4]));
      result.push(m);
    });
    return result;
  }

  function extractDeviceTenkan() {
    const tbl = findTableAfterHeading("デバイス別転換");
    if (!tbl) return [];
    const rows = tbl.querySelectorAll("tbody tr");
    const result = [];
    rows.forEach((row) => {
      const th = row.querySelector("th");
      const tds = row.querySelectorAll("td");
      const device = mapDevice(text(th));
      if (!device) return;
      // 列順: お気に入り登録数, お気に入り登録率, 転換数, 転換率, 売上
      const m = { device };
      m.favorites = parseNumber(text(tds[0]));
      m.favoriteRate = parseNumber(text(tds[1]));
      m.conversions = parseNumber(text(tds[2]));
      m.conversionRate = parseNumber(text(tds[3]));
      m.revenue = parseNumber(text(tds[4]));
      result.push(m);
    });
    return result;
  }

  function mergeDeviceMetrics(soukyaku, tenkan) {
    const map = new Map();
    for (const s of soukyaku) map.set(s.device, { ...s });
    for (const t of tenkan) {
      const cur = map.get(t.device) ?? { device: t.device };
      map.set(t.device, { ...cur, ...t });
    }
    return Array.from(map.values());
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

  // ------------------------------------------------------------------
  // 日別推移（3 テーブル分割）
  // ------------------------------------------------------------------
  async function ensureDailyExpanded() {
    const btn = document.querySelector("a.accordeonBtn");
    if (btn && !btn.classList.contains("opened")) {
      btn.click();
      // Angular の描画待ち
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  function extractDailyTrend() {
    const wrap = document.querySelector("div.tableWrapper.tableWrapperDaily");
    if (!wrap) return [];

    const leftTbl = wrap.querySelector(
      "div.tableLeftWrapper table.type2",
    );
    const headTbl = wrap.querySelector("div.tableCatWrapper table.type2");
    const dataTbl = wrap.querySelector("div.tableContentWrapper table.type2");
    if (!leftTbl || !headTbl || !dataTbl) return [];

    // 日付列: 各 tr の td (日付セル)を取り出す。1行目は ['', '日'] のヘッダ相当
    const leftRows = Array.from(leftTbl.querySelectorAll("tbody tr"));
    const dataRows = Array.from(dataTbl.querySelectorAll("tbody tr"));
    if (leftRows.length === 0 || dataRows.length === 0) return [];

    // ヘッダ列名（row2）
    const headers = readType2Headers(headTbl);
    // recon 結果の列順: 開封(全体/PC/SP/Tablet) + クリック(全/PC/SP/Tablet) + 送客(全/PC/SP/Tablet) + お気に入り(5) + 転換(5) + 売上(5) + 売上/通
    const groupSpec = [
      { key: "opens", labels: ["全体", "PC", "スマートフォン", "タブレット"] },
      { key: "clicks", labels: ["全体", "PC", "スマートフォン", "タブレット"] },
      { key: "sends", labels: ["全体", "PC", "スマートフォン", "タブレット"] },
      {
        key: "favorites",
        labels: ["全体", "PC", "スマートフォン", "タブレット", "アプリ"],
      },
      {
        key: "conversions",
        labels: ["全体", "PC", "スマートフォン", "タブレット", "アプリ"],
      },
      {
        key: "revenue",
        labels: ["全体", "PC", "スマートフォン", "タブレット", "アプリ"],
      },
      { key: "revenuePerSent", labels: ["売上/通"] },
    ];

    const trend = [];
    // leftRows[0] はヘッダ ('','日') なので 1 から開始
    for (let i = 1; i < leftRows.length; i++) {
      const leftCells = leftRows[i].querySelectorAll("th, td");
      // [0] = "1日目" などラベル, [1] = "04/29"
      const dayText = text(leftCells[1] ?? leftCells[0]);
      const date = parseShortDate(dayText);
      if (!date) continue;

      const dataRow = dataRows[i - 1] ?? dataRows[i];
      if (!dataRow) continue;
      const tds = Array.from(dataRow.querySelectorAll("td"));

      const entry = { date };
      let col = 0;
      for (const grp of groupSpec) {
        for (const lbl of grp.labels) {
          if (lbl === "全体") {
            // 全体だけを抽出して保存（PC/SP/Tablet/アプリは省略）
            entry[grp.key] = parseNumber(text(tds[col]));
          } else if (grp.labels.length === 1) {
            entry[grp.key] = parseNumber(text(tds[col]));
          }
          col++;
        }
      }
      trend.push(entry);
    }
    return trend;
  }

  function parseShortDate(s) {
    if (!s) return null;
    // "04/29" or "04/29 ~"
    const m = s.match(/(\d{1,2})\/(\d{1,2})/);
    if (!m) return null;
    // 集計期間の年を使う（無ければ今年）
    const wrap = document.querySelector("p.dateWrapper > span");
    let year = new Date().getFullYear();
    if (wrap) {
      const my = text(wrap).match(/(\d{4})/);
      if (my) year = parseInt(my[1], 10);
    }
    return `${year}-${pad(m[1])}-${pad(m[2])}`;
  }

  // ------------------------------------------------------------------
  // ペイロード組み立て
  // ------------------------------------------------------------------
  async function buildPayload() {
    const header = extractHeader();
    const openCard = extractMainCard("div.statsBlock.statsBlock01"); // 開封率
    const visitCard = extractMainCard("div.statsBlock.statsBlock02"); // 送客率
    const mini = extractMiniStats();

    await ensureDailyExpanded();
    const dailyTrend = extractDailyTrend();
    const deviceSoukyaku = extractDeviceSoukyaku();
    const deviceTenkan = extractDeviceTenkan();
    const deviceBreakdown = mergeDeviceMetrics(deviceSoukyaku, deviceTenkan);

    return {
      brandId: getBrandId(),
      rakutenMailId: header.mailId,
      subject: header.subject,
      sentDate: toIsoDate(header.sentDateRaw),
      results: {
        sentCount: header.sentCount,
        openRate: openCard?.rate,
        openCount: openCard?.count,
        clickCount: mini.clickCount,
        salesCount: mini.transactionCount,
        salesAmount: mini.revenue,
      },
      rakuten: {
        mailId: header.mailId,
        subject: header.subject,
        sentStartAt: toIsoDateTime(header.sentStartAtRaw),
        sentEndAt: toIsoDateTime(header.sentEndAtRaw),
        aggregateFrom: header.aggregateFrom,
        aggregateTo: header.aggregateTo,
        conversionVisitRate: visitCard?.rate,
        conversionVisitCount: visitCard?.count,
        openRateDiffPt:
          openCard?.diffPt != null
            ? (openCard.diffSign === "neg" ? -1 : 1) * Math.abs(openCard.diffPt)
            : undefined,
        conversionVisitRateDiffPt:
          visitCard?.diffPt != null
            ? (visitCard.diffSign === "neg" ? -1 : 1) *
              Math.abs(visitCard.diffPt)
            : undefined,
        favoriteCount: mini.favoriteCount,
        favoriteRate: mini.favoriteRate,
        transactionCount: mini.transactionCount,
        transactionRate: mini.transactionRate,
        revenuePerSent: mini.revenuePerSent,
        deviceBreakdown,
        dailyTrend,
        sourceUrl: location.href,
      },
    };
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
      width: 340px; background: #fff; border: 1px solid #ccc;
      border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.15);
      font-size: 12px;
    }
    #mm-import-panel header {
      padding: 8px 12px; background: #8c7b6b; color: #fff;
      border-radius: 8px 8px 0 0; display: flex; justify-content: space-between;
      align-items: center;
    }
    #mm-import-panel .body { padding: 10px 12px; }
    #mm-import-panel button {
      cursor: pointer; padding: 6px 10px; border-radius: 4px;
      border: 1px solid #ccc; background: #f7f5f1; margin-right: 4px; font-size: 12px;
    }
    #mm-import-panel button.primary { background: #8c7b6b; color: #fff; border-color: #8c7b6b; }
    #mm-import-panel button:disabled { opacity: .4; cursor: not-allowed; }
    #mm-import-panel input { width: 100%; padding: 4px 6px; font-size: 11px; box-sizing: border-box; margin-top: 2px; }
    #mm-import-panel pre { background: #f4f1ec; padding: 6px; border-radius: 4px; max-height: 220px; overflow: auto; font-size: 10px; }
    #mm-import-panel .row { margin-bottom: 6px; }
    #mm-import-panel .log { color: #555; word-break: break-all; }
    #mm-import-panel .ok { color: #2e7d32; }
    #mm-import-panel .err { color: #c62828; }
    #mm-import-panel .pageStatus { font-size: 10px; color: #999; }
  `);

  function mountUI() {
    if (document.getElementById("mm-import-panel")) {
      updatePageStatus();
      return;
    }
    const root = document.createElement("div");
    root.id = "mm-import-panel";
    root.innerHTML = `
      <header>
        <span>📨 Mail-magazine 取り込み</span>
        <span style="cursor:pointer" data-act="toggle">_</span>
      </header>
      <div class="body">
        <div class="row pageStatus" data-page-status></div>
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
    updatePageStatus();

    const log = (html, cls = "") => {
      root.querySelector("[data-log]").innerHTML =
        `<span class="${cls}">${html}</span>`;
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
        if (!isPerformancePage()) {
          log("このページは分析画面ではありません (#/performance/{ID})", "err");
          return;
        }
        try {
          log(act === "dry" ? "DOM をスキャン中..." : "送信中...");
          const payload = await buildPayload();
          if (!payload.rakutenMailId) {
            log("メルマガIDを URL から取得できませんでした", "err");
            return;
          }
          const res = await send(payload, act === "dry");
          if (act === "dry") {
            log(
              `マッチ: ${escapeHtml(res.matched?.title ?? "?")} (${res.matched?.reason ?? "?"})<br><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`,
              "ok",
            );
          } else {
            log(
              `取り込み完了: ${escapeHtml(res.matched?.title ?? "?")} (${res.matched?.reason ?? "?"})`,
              "ok",
            );
          }
        } catch (err) {
          log(`失敗: ${escapeHtml(JSON.stringify(err))}`, "err");
        }
      }
      if (act === "toggle") {
        const body = root.querySelector(".body");
        body.style.display = body.style.display === "none" ? "block" : "none";
      }
    });
  }

  function updatePageStatus() {
    const root = document.getElementById("mm-import-panel");
    if (!root) return;
    const el = root.querySelector("[data-page-status]");
    if (!el) return;
    const id = getMailIdFromHash();
    el.textContent = id
      ? `現在のメルマガID: ${id}`
      : "分析画面に移動してください (#/performance/{ID})";
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
  // 起動 + SPA 監視
  // ------------------------------------------------------------------
  mountUI();
  setTimeout(mountUI, 1500);
  window.addEventListener("hashchange", updatePageStatus);
  // body の差し替えに追従
  const mo = new MutationObserver(() => mountUI());
  mo.observe(document.body, { childList: true });
})();
