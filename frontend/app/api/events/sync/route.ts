/**
 * Google スプレッドシート（楽天イベントカレンダー）から CSV を取得して
 * frontend/data/events.json を更新するエンドポイント。
 *
 * - スプレッドシート ID: events.json の `source` で示されたシート
 * - シート gid=1740705934 が楽天イベントの正式シート
 * - 「×ポイントアップ」等の派生イベントは除外
 * - 同 category + 同 announcementDate は1件にユニーク化
 */
import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPREADSHEET_ID = "1XzHo3EGAnBIIt_1Ww44kiuwYbaNW8bvSfgOjvJt_pvg";
const SHEET_GID = "1740705934";

/** events.json に取り込むイベント分類（既存運用に合わせる） */
const ALLOWED_CATEGORIES = new Set<string>([
  "お買い物マラソン",
  "楽天スーパーSALE",
  "ブラックフライデー",
  "大感謝祭",
  "初売り",
  "ワンダフルデー",
  "5と0のつく日",
  "18日ご愛顧感謝デー",
  "Rakuten Fashion",
]);

/** イベント分類 → events.json の type */
const CATEGORY_TO_TYPE: Record<string, string> = {
  お買い物マラソン: "marathon",
  楽天スーパーSALE: "supersale",
  ブラックフライデー: "blackfriday",
  大感謝祭: "yearend",
  初売り: "newyear",
  ワンダフルデー: "wonderfulday",
  "5と0のつく日": "fiveday",
  "18日ご愛顧感謝デー": "loyalty18",
  "Rakuten Fashion": "fashion",
};

type RakutenCalendarEvent = {
  type: string;
  category: string;
  name: string;
  announcementDate: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  pageUrl: string | null;
};

type EventsJson = {
  source: string;
  lastSynced: string;
  note: string;
  events: RakutenCalendarEvent[];
};

/** 単純な CSV パーサ（ダブルクォート / 改行 / カンマエスケープ対応） */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch === "\r") {
        // skip
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** "2025-10-04 20:00:00" / "2025-10-04" → ISO with +09:00 */
function toIsoJst(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD H:MM:SS"
  const m = s.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, Se] = m;
  const pad = (v: string | undefined, n = 2) =>
    (v ?? "0").padStart(n, "0");
  if (H == null) {
    return `${Y}-${pad(Mo)}-${pad(D)}T00:00:00+09:00`;
  }
  return `${Y}-${pad(Mo)}-${pad(D)}T${pad(H)}:${pad(Mi)}:${pad(Se)}+09:00`;
}

function isDerivative(name: string): boolean {
  // 「×ポイントアップ」「×〇倍」など派生告知
  return /×/.test(name);
}

/**
 * スプレッドシートのイベント分類が名前と矛盾するケースを補正。
 * 例: name=「毎月5と0のつく日は…」だが category=「お買い物マラソン」
 *     → category を「5と0のつく日」に上書き
 */
function reclassifyByName(name: string, category: string): string {
  if (/5と0のつく日/.test(name)) return "5と0のつく日";
  if (/ご愛顧感謝デー/.test(name)) return "18日ご愛顧感謝デー";
  if (/ワンダフルデー/.test(name)) return "ワンダフルデー";
  if (/ブラックフライデー/.test(name)) return "ブラックフライデー";
  if (/大感謝祭/.test(name)) return "大感謝祭";
  if (/初売り|新春/.test(name)) return "初売り";
  if (/楽天スーパーSALE/.test(name)) return "楽天スーパーSALE";
  return category;
}

function originOk(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

  let csvText: string;
  try {
    const r = await fetch(csvUrl, { redirect: "follow", cache: "no-store" });
    if (!r.ok) {
      return Response.json(
        {
          error: "スプレッドシートの取得に失敗",
          status: r.status,
          hint: "公開設定（リンクを知っている全員が閲覧可）になっているか確認してください",
        },
        { status: 502 },
      );
    }
    csvText = await r.text();
  } catch (e) {
    return Response.json(
      { error: "ネットワーク失敗", detail: String(e) },
      { status: 502 },
    );
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return Response.json(
      { error: "CSV が空、またはヘッダのみ" },
      { status: 502 },
    );
  }
  const header = rows[0];
  const idx = (col: string) => header.indexOf(col);
  const I = {
    name: idx("イベント名"),
    start: idx("開始日時"),
    end: idx("終了日時"),
    announce: idx("告知解禁日時"),
    cat: idx("イベント分類"),
    status: idx("開催状況"),
    page: idx("キャンペーンページURL"),
  };
  for (const [k, v] of Object.entries(I)) {
    if (v < 0) {
      return Response.json(
        { error: `必須カラムが見つかりません: ${k}` },
        { status: 502 },
      );
    }
  }

  const collected = new Map<string, RakutenCalendarEvent>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    let category = (row[I.cat] ?? "").trim();
    const name = (row[I.name] ?? "").trim();
    if (!name) continue;
    if (isDerivative(name)) continue;
    // スプレッドシート上の イベント分類 が誤っている場合は名前から補正
    category = reclassifyByName(name, category);
    if (!ALLOWED_CATEGORIES.has(category)) continue;
    const announcementDate = toIsoJst(row[I.announce] ?? "");
    const startDate = toIsoJst(row[I.start] ?? "");
    const endDate = toIsoJst(row[I.end] ?? "");
    const status = (row[I.status] ?? "").trim();
    const pageRaw = (row[I.page] ?? "").trim();
    const pageUrl = pageRaw && pageRaw !== "ー" ? pageRaw : null;

    // 同 category + 同 期間（startDate, endDate）を1件にユニーク化
    const dedupKey = `${category}|${startDate ?? ""}|${endDate ?? ""}`;
    if (collected.has(dedupKey)) continue;

    collected.set(dedupKey, {
      type: CATEGORY_TO_TYPE[category] ?? "custom",
      category,
      name,
      announcementDate,
      startDate,
      endDate,
      status,
      pageUrl,
    });
  }

  const events = Array.from(collected.values()).sort((a, b) => {
    const ax = a.startDate ?? "";
    const bx = b.startDate ?? "";
    return ax.localeCompare(bx);
  });

  if (events.length === 0) {
    return Response.json(
      { error: "対象イベントが0件、フィルタが厳しすぎる可能性" },
      { status: 502 },
    );
  }

  const lastSynced = new Date().toISOString();
  try {
    await updateJsonFile<EventsJson>(
      "frontend/data/events.json",
      (current) => ({
        source: current.source,
        lastSynced,
        note: current.note,
        events,
      }),
      `chore: sync events.json from spreadsheet (${events.length} events)`,
    );
  } catch (e) {
    return Response.json(
      { error: "GitHub への書き込みに失敗", detail: String(e) },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    count: events.length,
    lastSynced,
  });
}
