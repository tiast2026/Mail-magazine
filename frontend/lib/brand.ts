import type { BrandButtons, BrandConfig, ButtonStyle } from "./types";

/**
 * ブランド config に buttons セクションが無い場合のフォールバック。
 * colors から 3 種（coupon/product/secondary）を組み立てる。
 */
function getButtons(brand: BrandConfig): BrandButtons {
  if (brand.buttons) return brand.buttons;
  const c = brand.colors;
  return {
    coupon: {
      bg: c.accent,
      fg: c.white,
      width: "80%",
      size: "3",
      padding: "16px 24px",
      border: null,
    },
    product: {
      bg: c.primary,
      fg: c.white,
      width: "80%",
      size: "3",
      padding: "14px 20px",
      border: null,
    },
    secondary: {
      bg: c.panel,
      fg: c.primary,
      width: "80%",
      size: "2",
      padding: "14px 20px",
      border: c.border,
    },
  };
}

/**
 * 1 つのボタンマクロを楽天 R-Mail 互換の <table>+<a> ブロックに展開する。
 * インライン CSS のみ・class なし・<style> なし。
 */
function renderButton(
  type: string,
  url: string,
  label: string,
  buttons: BrandButtons,
): string {
  const style: ButtonStyle =
    (buttons as unknown as Record<string, ButtonStyle>)[type] ??
    buttons.secondary;
  const width = style.width ?? "80%";
  const padding = style.padding ?? "14px 20px";
  const size = style.size ?? "3";
  const borderCss = style.border ? `border:1px solid ${style.border};` : "";
  return [
    `<table width="${width}" border="0" cellpadding="0" cellspacing="0" align="center" bgcolor="${style.bg}" style="margin: 18px auto;">`,
    `<tr>`,
    `<td align="center" style="padding:${padding};${borderCss}">`,
    `<a target="_blank" href="${url}" style="text-decoration:none;">`,
    `<font color="${style.fg}" size="${size}"><b>${label}</b></font>`,
    `</a>`,
    `</td>`,
    `</tr>`,
    `</table>`,
  ].join("");
}

/**
 * ボタンマクロは `[[BUTTON:type|url|label]]` 形式。
 * 外側を `[[ ]]` にしているのは、url 部に `{{PRODUCT1_URL}}` 等の `}}` を含む
 * 別プレースホルダが入りうるため（`{{ }}` だと正規表現が早期終了する）。
 */
const BUTTON_MACRO_RE = /\[\[BUTTON:([a-zA-Z]+)\|([^|\]]+)\|([^\]]+?)\]\]/g;

/**
 * テンプレ HTML の {{COLOR_*}} などをブランド config の値に置換する。
 * クライアント / サーバー どちらからも使える純粋関数。
 *
 * 同時に [[BUTTON:type|url|label]] マクロを楽天 R-Mail 互換のボタン HTML に展開する。
 * type: coupon / product / secondary（それ以外は secondary にフォールバック）
 */
export function applyBrandToHtml(html: string, brand: BrandConfig): string {
  const noahlAlias = brand.name === "NOAHL" ? "ノアル" : brand.name;
  const replacements: Record<string, string> = {
    "{{COLOR_PRIMARY}}": brand.colors.primary,
    "{{COLOR_ACCENT}}": brand.colors.accent,
    "{{COLOR_MUTED}}": brand.colors.muted,
    "{{COLOR_TEXT}}": brand.colors.text,
    "{{COLOR_SUBTEXT}}": brand.colors.subtext,
    "{{COLOR_PANEL}}": brand.colors.panel,
    "{{COLOR_BORDER}}": brand.colors.border,
    "{{COLOR_WHITE}}": brand.colors.white,
    "{{BRAND_LOGO}}": brand.logoText,
    "{{BRAND_TAGLINE}}": `- ${brand.tagline} -`,
    "{{BRAND_LOGO_FULL}}": `${brand.logoText} ( ${noahlAlias} )`,
    "{{URL_NEW_ARRIVALS}}": brand.fixedUrls?.newArrivals ?? "",
    "{{URL_REVIEW}}": brand.fixedUrls?.review ?? "",
    "{{URL_SALE}}": brand.fixedUrls?.salePage ?? "",
  };
  let out = html;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  // ボタンマクロ展開（簡易置換が完了した後 = URL_* 等が実 URL に化けた後に行う）
  const buttons = getButtons(brand);
  out = out.replace(BUTTON_MACRO_RE, (_, type: string, url: string, label: string) =>
    renderButton(type.toLowerCase(), url.trim(), label.trim(), buttons),
  );
  return out;
}

/**
 * テンプレ HTML 内の {{KEY}} を sampleVariables の値で置換する。
 * 完成版プレビュー表示用。
 */
export function applyVariablesToHtml(
  html: string,
  variables: Record<string, string>,
): string {
  let out = html;
  for (const [k, v] of Object.entries(variables)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}
