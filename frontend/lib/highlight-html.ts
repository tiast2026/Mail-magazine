/**
 * 軽量な HTML シンタックスハイライト。
 * 楽天メルマガ HTML（コメント・タグ・属性）に最適化。
 *
 * 出力: HTML エンティティでエスケープ済み + <span class="hl-..."> でラップ
 *   hl-comment    コメント      stone-500
 *   hl-bracket    < / > / </    rose-400
 *   hl-tag        タグ名         rose-300
 *   hl-attr       属性名         emerald-300
 *   hl-string     文字列値       amber-200
 *   hl-equals     =             stone-400
 *   hl-text       通常テキスト   stone-200（デフォルト）
 */
export function highlightHtml(source: string): string {
  if (!source) return "";
  const out: string[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    // コメント: <!-- ... -->
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i + 4);
      const stop = end === -1 ? len : end + 3;
      const content = source.substring(i, stop);
      out.push(`<span class="hl-comment">${escapeHtml(content)}</span>`);
      i = stop;
      continue;
    }
    // DOCTYPE
    if (source.startsWith("<!", i)) {
      const end = source.indexOf(">", i);
      const stop = end === -1 ? len : end + 1;
      out.push(
        `<span class="hl-comment">${escapeHtml(source.substring(i, stop))}</span>`,
      );
      i = stop;
      continue;
    }
    // タグ
    if (source[i] === "<") {
      const end = source.indexOf(">", i);
      if (end === -1) {
        out.push(escapeHtml(source.substring(i)));
        break;
      }
      out.push(highlightTag(source.substring(i, end + 1)));
      i = end + 1;
      continue;
    }
    // 通常テキスト（次の < まで）
    const next = source.indexOf("<", i);
    const stop = next === -1 ? len : next;
    out.push(escapeHtml(source.substring(i, stop)));
    i = stop;
  }
  return out.join("");
}

function highlightTag(raw: string): string {
  // raw は "<...>" の形式（< と > を含む）
  // 内部を: <、(/?)、tagName、attrs、(/?)、> に分解
  const inner = raw.slice(1, -1);
  const m = inner.match(/^(\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?)$/);
  if (!m) return escapeHtml(raw);
  const closeSlash = m[1];
  const tagName = m[2];
  const rest = m[3];
  const selfSlash = m[4];

  let attrsHtml = "";
  // 属性: 空白 + name (= value)?
  // value: "..." | '...' | unquoted
  const attrRe =
    /(\s+)([a-zA-Z_:][\w:.-]*)(?:(\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let lastIdx = 0;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(rest))) {
    const space = am[1];
    const name = am[2];
    const eq = am[3];
    const valWithQuotes = am[4];
    if (am.index > lastIdx) {
      attrsHtml += escapeHtml(rest.substring(lastIdx, am.index));
    }
    attrsHtml += escapeHtml(space);
    attrsHtml += `<span class="hl-attr">${escapeHtml(name)}</span>`;
    if (eq !== undefined) {
      attrsHtml += `<span class="hl-equals">${escapeHtml(eq)}</span>`;
      attrsHtml += `<span class="hl-string">${escapeHtml(valWithQuotes)}</span>`;
    }
    lastIdx = am.index + am[0].length;
  }
  if (lastIdx < rest.length) {
    attrsHtml += escapeHtml(rest.substring(lastIdx));
  }

  return (
    `<span class="hl-bracket">&lt;${closeSlash}</span>` +
    `<span class="hl-tag">${escapeHtml(tagName)}</span>` +
    attrsHtml +
    (selfSlash ? `<span class="hl-bracket">${selfSlash}</span>` : "") +
    `<span class="hl-bracket">&gt;</span>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
