// ==UserScript==
// @name         楽天R-Mail 実績取り込み (Mail-magazine)
// @namespace    https://mail-magazine.vercel.app/
// @version      0.7.16
// @description  R-Mail #/trend 一括取り込み（詳細モードは取込済みも再実行可能）
// @author       Mail-magazine
// @match        https://mainmenu.rms.rakuten.co.jp/*
// @match        https://rmail.rms.rakuten.co.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  const SCRIPT_VERSION = "0.7.15";
  const DEFAULT_ENDPOINT = "https://mail-magazine.vercel.app/api/results/import";
  const IMPORTED_ENDPOINT = "https://mail-magazine.vercel.app/api/results/imported";
  const TREND_URL = "https://rmail.rms.rakuten.co.jp/#/trend";
  const BOOTSTRAP_URL = "https://rmail.rms.rakuten.co.jp/?menu=manage&act=cross_device_monthly_summary#/trend";
  const AUTOSTART_KEY = "mm-autostart-v0713";

  const LAST_RUN_KEY = "mm_lastRun";

  let userClicked = false;

  const getEndpoint = () => GM_getValue("endpoint", DEFAULT_ENDPOINT);
  const getToken = () => GM_getValue("token", "");
  const getBrandId = () => GM_getValue("brandId", "noahl");
  const getDetailMode = () => GM_getValue("detailMode", false);

  function getLastRun() {
    try {
      const iso = GM_getValue(LAST_RUN_KEY, "");
      if (iso) return new Date(iso);
    } catch {}
    return null;
  }
  function setLastRun() {
    try { GM_setValue(LAST_RUN_KEY, new Date().toISOString()); } catch {}
  }

  const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const pad = (s) => String(s).padStart(2, "0");

  function formatLastRun(d) {
    if (!d || isNaN(d.getTime())) return "未実行";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function relativeFromNow(d) {
    if (!d || isNaN(d.getTime())) return "";
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return "たった今";
    if (min < 60) return `${min}分前`;
    if (min < 60 * 24) return `${Math.floor(min / 60)}時間前`;
    return `${Math.floor(min / (60 * 24))}日前`;
  }

  function parseNum(t) {
    if (t == null) return null;
    const m = String(t).replace(/[¥￥,]/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function parsePctInside(t) {
    if (!t) return null;
    const m = String(t).match(/\(([\d.]+)\s*%\)/);
    return m ? parseFloat(m[1]) : null;
  }
  function parseCountInside(t) {
    if (!t) return null;
    const cleaned = String(t).replace(/\([^)]*\)/g, "");
    const m = cleaned.replace(/[,\s]/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function isRMailHost() { return location.host === "rmail.rms.rakuten.co.jp"; }
  function isMainHost() { return location.host === "mainmenu.rms.rakuten.co.jp"; }
  function isTrendPage() {
    return isRMailHost() && /^#\/trend(?!\/performance)/.test(location.hash || "");
  }
  function isPerformancePage() {
    return isRMailHost() && /^#\/(?:trend\/)?performance\/\d+/.test(location.hash || "");
  }

  function findTrendTable() {
    const trendRoot = document.querySelector("trend-root");
    if (trendRoot) {
      const tbl = trendRoot.querySelector("table.type2");
      if (tbl && hasMailHeaders(tbl)) return tbl;
    }
    for (const tbl of document.querySelectorAll("table.type2")) {
      if (hasMailHeaders(tbl)) return tbl;
    }
    return null;
  }

  function hasMailHeaders(tbl) {
    const head = (tbl.querySelector("thead") || tbl).textContent || "";
    return ["ID", "サブジェクト", "開封数", "送客数", "転換数"].every((k) => head.includes(k));
  }

  async function waitForTrendTable() {
    const start = Date.now();
    while (Date.now() - start < 25000) {
      const tbl = findTrendTable();
      if (tbl && tbl.querySelectorAll("tbody tr").length > 0) {
        await new Promise((r) => setTimeout(r, 600));
        return tbl;
      }
      if (isRMailHost() && !isTrendPage() && !isPerformancePage()) {
        location.hash = "#/trend";
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  }

  function getColumnIndex(tbl) {
    const ths = tbl.querySelectorAll("thead th");
    const headers = Array.from(ths).map((th) => text(th));
    const idx = {};
    headers.forEach((h, i) => {
      const k = h.replace(/[\s　]+/g, "");
      if (/^ID/.test(k)) idx.id = i;
      else if (/サブジェクト|件名/.test(k)) idx.subject = i;
      else if (/送信開始日/.test(k)) idx.sentDate = i;
      else if (k === "送信数") idx.sentCount = i;
      else if (/開封数/.test(k)) idx.opens = i;
      else if (/クリック数/.test(k)) idx.clicks = i;
      else if (/送客数/.test(k)) idx.sends = i;
      else if (/転換数/.test(k)) idx.conversions = i;
      else if (k === "売上") idx.revenue = i;
      else if (/売上\/通/.test(k)) idx.revPerSent = i;
    });
    return idx;
  }

  function parseTrendRow(row, idx) {
    const cells = Array.from(row.querySelectorAll("td"));
    if (!cells.length) return null;
    const idText = text(cells[idx.id]);
    const idMatch = idText.match(/\d{6,12}/);
    if (!idMatch) return null;
    const id = idMatch[0];
    const subjectCell = cells[idx.subject];
    const subjectLink = subjectCell?.querySelector("a");
    const subject = text(subjectLink || subjectCell);
    const sentDateRaw = idx.sentDate != null ? text(cells[idx.sentDate]) : "";
    const sentCount = idx.sentCount != null ? parseNum(text(cells[idx.sentCount])) : null;
    const opensText = idx.opens != null ? text(cells[idx.opens]) : "";
    const openCount = parseCountInside(opensText);
    const openRate = parsePctInside(opensText);
    const clickCount = idx.clicks != null ? parseNum(text(cells[idx.clicks])) : null;
    const sendsText = idx.sends != null ? text(cells[idx.sends]) : "";
    const sendCount = parseCountInside(sendsText);
    const sendRate = parsePctInside(sendsText);
    const txText = idx.conversions != null ? text(cells[idx.conversions]) : "";
    const txCount = parseCountInside(txText);
    const txRate = parsePctInside(txText);
    const revenue = idx.revenue != null ? parseNum(text(cells[idx.revenue])) : null;
    const revPerSent = idx.revPerSent != null ? parseNum(text(cells[idx.revPerSent])) : null;

    return {
      id, subject, sentDateRaw, sentCount,
      openCount, openRate, clickCount,
      sendCount, sendRate, txCount, txRate,
      revenue, revPerSent,
    };
  }

  async function fetchDetailMetrics(mailId) {
    const startHash = location.hash;
    location.hash = `#/trend/performance/${mailId}`;
    const start = Date.now();
    while (Date.now() - start < 12000) {
      if (document.querySelector("div.statsBlock.statsBlock01 p.percent") &&
          document.querySelector("table.type1.table01 tbody td")) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    const detail = scrapePerformancePage();
    location.hash = startHash || "#/trend";
    await new Promise((r) => setTimeout(r, 600));
    return detail;
  }

  /** コンテンツ分析画面の「ソース」ボタンから HTML を取得 */
  async function fetchHtmlContent(mailId) {
    const startHash = location.hash;
    location.hash = `#/content-analysis/${mailId}`;
    const start = Date.now();
    let html = null;
    while (Date.now() - start < 12000) {
      // ソースボタンを探す（class="btn"、テキスト「ソース」）
      const srcBtn = Array.from(document.querySelectorAll("a.btn, button"))
        .find((el) => text(el) === "ソース");
      if (srcBtn) {
        if (!srcBtn.classList.contains("active")) {
          srcBtn.click();
          await new Promise((r) => setTimeout(r, 1000));
        }
        // pre > code in panel-content
        const code =
          document.querySelector("div.panel-content pre code") ||
          document.querySelector("div.panel pre code") ||
          document.querySelector("pre code");
        if (code && (code.textContent || "").length > 100) {
          html = code.textContent.trim();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    location.hash = startHash || "#/trend";
    await new Promise((r) => setTimeout(r, 600));
    return html;
  }

  function scrapePerformancePage() {
    const out = {};
    const openCard = document.querySelector("div.statsBlock.statsBlock01");
    if (openCard) {
      out.openRate = parseNum(text(openCard.querySelector("p.percent")));
      out.openCount = parseNum(text(openCard.querySelector("p strong")));
    }
    const visitCard = document.querySelector("div.statsBlock.statsBlock02");
    if (visitCard) {
      out.conversionVisitRate = parseNum(text(visitCard.querySelector("p.percent")));
      out.conversionVisitCount = parseNum(text(visitCard.querySelector("p strong")));
    }
    document.querySelectorAll("div.miniStatsBlock").forEach((card) => {
      const labelP = card.querySelector(":scope > p");
      const label = text(labelP).replace(/\s+/g, "");
      const ps = card.querySelectorAll("div.resNum p");
      const main = parseNum(text(ps[0]));
      const small = ps[1] ? parseNum(text(ps[1])) : null;
      if (label.startsWith("クリック数")) out.clickCount = main;
      else if (label.startsWith("お気に入り登録率")) {
        out.favoriteCount = main; out.favoriteRate = small;
      } else if (label.startsWith("転換数")) {
        out.transactionCount = main; out.transactionRate = small;
      } else if (label === "売上") out.revenue = main;
      else if (label === "売上/通") out.revenuePerSent = main;
    });
    out.deviceBreakdown = scrapeDeviceTables();
    // 送信開始日時 / 送信完了日時 を thead-tbody テーブルから抽出
    document.querySelectorAll("table").forEach((tbl) => {
      const thead = tbl.querySelector("thead tr");
      if (!thead) return;
      const ths = Array.from(thead.querySelectorAll("th")).map((th) =>
        text(th).replace(/\s+/g, ""),
      );
      const tr = tbl.querySelector("tbody tr");
      if (!tr) return;
      const tds = Array.from(tr.querySelectorAll("td"));
      ths.forEach((th, i) => {
        if (th === "送信開始日時") out.sentStartAt = parseDateTimeJP(text(tds[i]));
        else if (th === "送信完了日時") out.sentEndAt = parseDateTimeJP(text(tds[i]));
      });
    });
    return out;
  }

  /** "2026/05/01 08:10:01" 形式を ISO8601(+09:00) に変換 */
  function parseDateTimeJP(s) {
    if (!s) return null;
    const m = s.match(
      /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    );
    if (!m) return null;
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}:${m[6] || "00"}+09:00`;
  }

  function scrapeDeviceTables() {
    const map = new Map();
    document.querySelectorAll("h3.partSubtitle").forEach((h) => {
      const t = text(h);
      let isVisit = /デバイス別送客/.test(t);
      let isTrans = /デバイス別転換/.test(t);
      if (!isVisit && !isTrans) return;
      let sib = h.nextElementSibling;
      let tbl = null;
      while (sib) {
        if (sib.matches?.("table.type2")) { tbl = sib; break; }
        const inner = sib.querySelector?.("table.type2");
        if (inner) { tbl = inner; break; }
        sib = sib.nextElementSibling;
      }
      if (!tbl) return;
      tbl.querySelectorAll("tbody tr").forEach((row) => {
        const th = row.querySelector("th");
        const tds = row.querySelectorAll("td");
        const dev = mapDevice(text(th));
        if (!dev) return;
        const cur = map.get(dev) || { device: dev };
        if (isVisit) {
          cur.opens = parseNum(text(tds[0]));
          cur.openRate = parseNum(text(tds[1]));
          cur.clicks = parseNum(text(tds[2]));
          cur.sent = parseNum(text(tds[3]));
          cur.sendRate = parseNum(text(tds[4]));
        } else {
          cur.favorites = parseNum(text(tds[0]));
          cur.favoriteRate = parseNum(text(tds[1]));
          cur.conversions = parseNum(text(tds[2]));
          cur.conversionRate = parseNum(text(tds[3]));
          cur.revenue = parseNum(text(tds[4]));
        }
        map.set(dev, cur);
      });
    });
    return Array.from(map.values());
  }

  function mapDevice(label) {
    const t = label.replace(/\s/g, "");
    if (/^PC/.test(t)) return "pc";
    if (/スマートフォン/.test(t)) return "smartphone";
    if (/タブレット/.test(t)) return "tablet";
    if (/アプリ/.test(t)) return "app";
    if (/合計/.test(t)) return "total";
    return null;
  }

  function toIsoDate(s) {
    if (!s) return null;
    const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null;
  }

  function buildPayload(row, detail, html) {
    return {
      brandId: getBrandId(),
      rakutenMailId: row.id,
      subject: row.subject,
      sentDate: toIsoDate(row.sentDateRaw),
      html: html || undefined,
      results: {
        sentCount: row.sentCount ?? undefined,
        openRate: detail?.openRate ?? row.openRate ?? undefined,
        openCount: detail?.openCount ?? row.openCount ?? undefined,
        clickCount: detail?.clickCount ?? row.clickCount ?? undefined,
        salesCount: detail?.transactionCount ?? row.txCount ?? undefined,
        salesAmount: detail?.revenue ?? row.revenue ?? undefined,
      },
      rakuten: {
        mailId: row.id,
        subject: row.subject,
        sentStartAt: detail?.sentStartAt,
        sentEndAt: detail?.sentEndAt,
        conversionVisitRate: detail?.conversionVisitRate ?? row.sendRate ?? undefined,
        conversionVisitCount: detail?.conversionVisitCount ?? row.sendCount ?? undefined,
        transactionCount: detail?.transactionCount ?? row.txCount ?? undefined,
        transactionRate: detail?.transactionRate ?? row.txRate ?? undefined,
        revenuePerSent: detail?.revenuePerSent ?? row.revPerSent ?? undefined,
        favoriteCount: detail?.favoriteCount,
        favoriteRate: detail?.favoriteRate,
        deviceBreakdown: detail?.deviceBreakdown,
        sourceUrl: location.href,
      },
    };
  }

  function send(payload) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: getEndpoint(),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        data: JSON.stringify(payload),
        onload: (r) => {
          try {
            const json = JSON.parse(r.responseText || "{}");
            if (r.status >= 200 && r.status < 300) resolve(json);
            else reject(json);
          } catch { reject({ status: r.status, body: r.responseText }); }
        },
        onerror: (e) => reject(e),
      });
    });
  }

  function fetchImportedIds() {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `${IMPORTED_ENDPOINT}?brandId=${encodeURIComponent(getBrandId())}`,
        onload: (r) => {
          try {
            const json = JSON.parse(r.responseText || "{}");
            const ids = (json.imported || []).map((x) => x.mailId).filter(Boolean);
            resolve(new Set(ids));
          } catch { resolve(new Set()); }
        },
        onerror: () => resolve(new Set()),
      });
    });
  }

  async function runCollection(btn) {
    const setBtn = (t) => { if (btn) btn.textContent = t; };
    setBtn("⏳ テーブル読込…");

    const tbl = await waitForTrendTable();
    if (!tbl) { alert("メルマガ一覧テーブルが見つかりません"); return; }
    const idx = getColumnIndex(tbl);
    const rows = Array.from(tbl.querySelectorAll("tbody tr"))
      .map((r) => parseTrendRow(r, idx)).filter(Boolean);
    if (!rows.length) { alert("対象メルマガがありません"); return; }

    setBtn("⏳ 取込済みリスト確認…");
    const importedSet = await fetchImportedIds();
    const detailMode = getDetailMode();

    let pending = rows.filter((r) => !importedSet.has(r.id));
    let skipped = rows.length - pending.length;

    if (detailMode && pending.length === 0 && rows.length > 0) {
      // 詳細モード ON で全件取込済み: 再実行して詳細データを追加するか確認
      const yes = confirm(
        `全 ${rows.length} 件すべて取込済みですが、詳細モード ON です。\n` +
        `既存データに HTML・デバイス別データを追加するため、全 ${rows.length} 件を再実行しますか？\n\n` +
        `（時間がかかります: 約 ${Math.ceil(rows.length * 5 / 60)} 分）`
      );
      if (!yes) return;
      pending = rows;
      skipped = 0;
    } else if (pending.length === 0) {
      alert(`全 ${rows.length} 件すべて取り込み済みです`);
      return;
    } else {
      const msg = `全 ${rows.length} 件中 ${skipped} 件は取込済み。\n未取込 ${pending.length} 件を取り込みます。\n\n詳細モード: ${detailMode ? "ON（HTML+デバイス別も取得・遅い）" : "OFF（基本データのみ・速い）"}\n\nよろしいですか？`;
      if (!confirm(msg)) return;
    }

    let ok = 0, ng = 0;
    const errors = [];
    for (let i = 0; i < pending.length; i++) {
      const row = pending[i];
      setBtn(`⏳ ${i + 1}/${pending.length}: ${row.id}`);
      try {
        let detail = null;
        let html = null;
        if (detailMode) {
          try { detail = await fetchDetailMetrics(row.id); } catch {}
          try { html = await fetchHtmlContent(row.id); } catch {}
        }
        await send(buildPayload(row, detail, html));
        ok++;
      } catch (err) {
        ng++;
        errors.push({ id: row.id, subject: row.subject, error: err });
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    setLastRun();
    updateStatusUI();

    if (ng) {
      console.warn("Mail-magazine 取り込みエラー:", errors);
      alert(`完了: 成功 ${ok} / 失敗 ${ng}\n（エラー詳細は Console を確認）`);
    } else {
      alert(`完了: 全 ${ok} 件取り込みました`);
    }
  }

  // ----------------------------------------------
  // UI: 楽天イベント取得 と同一スタイル
  // ----------------------------------------------
  function updateStatusUI() {
    const st = document.getElementById("mm-status");
    if (!st) return;
    const last = getLastRun();
    if (last) {
      st.innerHTML = `前回実行: ${formatLastRun(last)} <span style="opacity:.75">(${relativeFromNow(last)})</span>`;
    } else {
      st.textContent = "前回実行: 未実行";
    }
  }

  function injectButtons() {
    if (document.getElementById("mm-event-wrap")) return;

    const wrap = document.createElement("div");
    wrap.id = "mm-event-wrap";
    Object.assign(wrap.style, {
      position: "fixed", left: "16px", bottom: "70px", zIndex: 999999,
      display: "flex", alignItems: "center", gap: "10px",
    });
    document.body.appendChild(wrap);

    const btn = document.createElement("button");
    btn.id = "mm-btn";
    btn.textContent = "📨 メルマガ分析取得";
    Object.assign(btn.style, {
      padding: "10px 16px", background: "#8c7b6b", color: "#fff",
      border: "none", borderRadius: "24px", cursor: "pointer",
      fontSize: "14px", boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      whiteSpace: "nowrap",
    });
    btn.addEventListener("click", (e) => {
      if (!e.isTrusted) return;
      userClicked = true;
      onClickButton();
    });
    wrap.appendChild(btn);

    const cog = document.createElement("button");
    cog.id = "mm-cog";
    cog.textContent = "⚙";
    cog.title = "設定";
    Object.assign(cog.style, {
      padding: "10px 12px", background: "#8c7b6b", color: "#fff",
      border: "none", borderRadius: "24px", cursor: "pointer",
      fontSize: "14px", boxShadow: "0 2px 8px rgba(0,0,0,.25)",
    });
    cog.addEventListener("click", openSettings);
    wrap.appendChild(cog);

    const status = document.createElement("div");
    status.id = "mm-status";
    Object.assign(status.style, {
      padding: "6px 12px", background: "rgba(0,0,0,.7)", color: "#fff",
      borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap",
      boxShadow: "0 2px 6px rgba(0,0,0,.18)",
    });
    wrap.appendChild(status);

    updateStatusUI();
    setInterval(updateStatusUI, 60 * 1000);
  }

  function openSettings() {
    const ep = prompt("API エンドポイント", getEndpoint()) ?? getEndpoint();
    const tk = prompt("Ingest トークン", getToken()) ?? getToken();
    const br = prompt("ブランド ID", getBrandId()) ?? getBrandId();
    const dm = confirm("詳細モード（各メルマガのデバイス別データも取得・遅い）を ON にしますか？\n[OK] = ON、[キャンセル] = OFF");
    GM_setValue("endpoint", ep || DEFAULT_ENDPOINT);
    GM_setValue("token", tk);
    GM_setValue("brandId", br || "noahl");
    GM_setValue("detailMode", dm);
    alert(`保存しました\n詳細モード: ${dm ? "ON" : "OFF"}`);
  }

  async function onClickButton() {
    if (!userClicked) return;
    if (!getToken()) {
      alert("Ingest トークン未設定です。⚙ から設定してください");
      userClicked = false;
      return;
    }
    const btn = document.getElementById("mm-btn");
    if (!btn) return;

    if (isMainHost() || (isRMailHost() && !isTrendPage() && !findTrendTable())) {
      sessionStorage.setItem(AUTOSTART_KEY, "1");
      btn.textContent = "⏳ R-Mail 起動中…";
      location.href = BOOTSTRAP_URL;
      return;
    }

    btn.disabled = true;
    try {
      await runCollection(btn);
      btn.textContent = "✅ 完了";
    } catch (e) {
      console.error(e);
      btn.textContent = "❌ エラー";
      alert("失敗: " + (e?.message || JSON.stringify(e)));
    } finally {
      userClicked = false;
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "📨 メルマガ分析取得";
      }, 4000);
    }
  }

  function boot() {
    console.log(`[Mail-magazine] v${SCRIPT_VERSION}`);
    injectButtons();

    if (isRMailHost() && sessionStorage.getItem(AUTOSTART_KEY) === "1") {
      sessionStorage.removeItem(AUTOSTART_KEY);
      if (!isTrendPage()) location.hash = "#/trend";
      setTimeout(() => {
        userClicked = true;
        onClickButton();
      }, 1500);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.addEventListener("hashchange", () => {});
  const mo = new MutationObserver(() => injectButtons());
  mo.observe(document.body, { childList: true });
})();
