import type { Block } from "./blocks";

interface ProductSlot {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateHeaderHtml(props: Record<string, unknown>): string {
  const brandName = escapeHtml(String(props.brandName || "ＮＯＡＨＬ"));
  const subtitle = escapeHtml(
    String(props.subtitle || "ノアル / レディースファッション")
  );
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
  <tr>
    <td align="center" style="padding: 25px 0 20px 0;">
      <font color="#8c7b6b" size="3" style="letter-spacing: 4px;">${brandName}</font><br>
      <font color="#b5a595" size="1" style="letter-spacing: 2px;">${subtitle}</font>
    </td>
  </tr>
</table>`;
}

function generateBannerHtml(props: Record<string, unknown>): string {
  const imageUrl = String(
    props.imageUrl ||
      "https://via.placeholder.com/600x300/f7f4f1/8c7b6b?text=BANNER"
  );
  const linkUrl = String(props.linkUrl || "#");
  const altText = escapeHtml(String(props.altText || "バナー画像"));
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <a target="_blank" href="${linkUrl}">
        <img width="100%" src="${imageUrl}" border="0" alt="${altText}">
      </a>
    </td>
  </tr>
</table>`;
}

function generateMessageHtml(props: Record<string, unknown>): string {
  const subtitle = escapeHtml(String(props.subtitle || ""));
  const title = escapeHtml(String(props.title || ""));
  const description = escapeHtml(String(props.description || "")).replace(
    /\n/g,
    "<br>"
  );
  const bgColor = String(props.bgColor || "#f7f4f1");
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${bgColor}">
  <tr>
    <td align="center" style="padding: 28px 15px;">
      <font color="#8c7b6b" size="2">${subtitle}</font><br><br>
      <font color="#625142" size="4"><b>${title}</b></font><br><br>
      <font color="#a89585" size="2">${description}</font>
    </td>
  </tr>
</table>`;
}

function generateProductSingleHtml(props: Record<string, unknown>): string {
  const imageUrl = String(
    props.imageUrl ||
      "https://via.placeholder.com/500x500/f7f4f1/8c7b6b?text=PRODUCT"
  );
  const productName = escapeHtml(String(props.productName || "商品名"));
  const originalPrice = escapeHtml(String(props.originalPrice || ""));
  const salePrice = escapeHtml(String(props.salePrice || ""));
  const linkUrl = String(props.linkUrl || "#");
  const buttonText = escapeHtml(String(props.buttonText || "商品を見る →"));
  const rank = String(props.rank || "");

  let rankHtml = "";
  if (rank) {
    rankHtml = `<tr><td align="center" style="padding: 10px 0 0 0;">
      <font color="#c4694a" size="5"><b>No.${escapeHtml(rank)}</b></font>
    </td></tr>`;
  }

  let priceHtml = "";
  if (originalPrice && salePrice) {
    priceHtml = `<font color="#b5a595" size="2"><strike>${originalPrice}</strike></font>
    <font color="#c4694a" size="3"><b> ${salePrice}</b></font>`;
  } else if (salePrice) {
    priceHtml = `<font color="#c4694a" size="3"><b>${salePrice}</b></font>`;
  } else if (originalPrice) {
    priceHtml = `<font color="#625142" size="3"><b>${originalPrice}</b></font>`;
  }

  return `<table width="100%" border="0" cellpadding="0" cellspacing="0">
  ${rankHtml}
  <tr><td align="center" style="padding: 5px 0;">
    <a target="_blank" href="${linkUrl}"><img src="${imageUrl}" width="85%" border="0" alt="${productName}"></a>
  </td></tr>
  <tr><td align="center" style="padding: 10px 0;">
    <font color="#625142" size="3"><b>${productName}</b></font><br>
    ${priceHtml}
  </td></tr>
  <tr><td align="center" style="padding: 15px 0 25px 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="80%">
      <tr><td align="center" bgcolor="#8c7b6b" style="padding: 16px 0; border-radius: 4px;">
        <a target="_blank" href="${linkUrl}" style="color: #ffffff; text-decoration: none; display: block;">
          <font color="#ffffff" size="3"><b>${buttonText}</b></font>
        </a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function generateProductGridHtml(props: Record<string, unknown>): string {
  const products = (props.products as ProductSlot[]) || [];
  const columns = Number(props.columns || 2);
  const rows = Number(props.rows || 1);

  let html = "";
  for (let r = 0; r < rows; r++) {
    html += `<table width="90%" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-bottom: 8px;">
  <tr>`;
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      const p = products[idx];
      const imgUrl =
        p?.imageUrl ||
        "https://via.placeholder.com/280x280/f7f4f1/8c7b6b?text=ITEM";
      const link = p?.linkUrl || "#";
      const alt = escapeHtml(String(p?.altText || `商品${idx + 1}`));
      const widthPct = Math.floor((100 - (columns - 1) * 2) / columns);
      if (c > 0) {
        html += `\n    <td width="2%"></td>`;
      }
      html += `\n    <td width="${widthPct}%" align="center" valign="top">
      <a target="_blank" href="${link}"><img width="100%" src="${imgUrl}" border="0" alt="${alt}"></a>
    </td>`;
    }
    html += `\n  </tr>
</table>\n`;
  }
  return html;
}

function generateCtaButtonHtml(props: Record<string, unknown>): string {
  const text = escapeHtml(String(props.text || "詳しくはこちら →"));
  const linkUrl = String(props.linkUrl || "#");
  const bgColor = String(props.bgColor || "#8c7b6b");
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding: 20px 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="80%">
      <tr><td align="center" bgcolor="${bgColor}" style="padding: 16px 0; border-radius: 4px;">
        <a target="_blank" href="${linkUrl}" style="color: #ffffff; text-decoration: none; display: block;">
          <font color="#ffffff" size="3"><b>${text}</b></font>
        </a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function generateCouponButtonHtml(props: Record<string, unknown>): string {
  const text = escapeHtml(String(props.text || "クーポンを獲得する →"));
  const linkUrl = String(props.linkUrl || "#");
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding: 20px 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="80%">
      <tr><td align="center" bgcolor="#c4694a" style="padding: 16px 0; border-radius: 4px;">
        <a target="_blank" href="${linkUrl}" style="color: #ffffff; text-decoration: none; display: block;">
          <font color="#ffffff" size="3"><b>${text}</b></font>
        </a>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function generateDividerHtml(): string {
  return `<table width="90%" border="0" cellpadding="0" cellspacing="0" align="center">
  <tr><td style="padding: 15px 0;"><div style="border-top: 1px solid #e8e2db;"></div></td></tr>
</table>`;
}

function generateTextLinkHtml(props: Record<string, unknown>): string {
  const text = escapeHtml(String(props.text || "テキストリンク"));
  const linkUrl = String(props.linkUrl || "#");
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding: 15px 0;">
    <a target="_blank" href="${linkUrl}" style="text-decoration: none;">
      <font color="#8c7b6b" size="2"><b>${text}</b></font>
    </a>
  </td></tr>
</table>`;
}

function generateFooterHtml(props: Record<string, unknown>): string {
  const newItemsUrl = String(props.newItemsUrl || "#");
  const reviewUrl = String(props.reviewUrl || "#");
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f7f4f1">
  <tr><td align="center" style="padding: 25px 15px;">
    <font color="#8c7b6b" size="2"><b>▽ NOAHLの新作をチェック ▽</b></font><br><br>
    <a target="_blank" href="${newItemsUrl}"><font color="#625142" size="2">新作一覧を見る &rarr;</font></a><br><br>
    <font color="#b5a595" size="1">──────────────</font><br><br>
    <a target="_blank" href="${reviewUrl}"><font color="#a89585" size="1">レビュー投稿でプレゼント♪ 詳しくはこちら &rarr;</font></a>
  </td></tr>
</table>
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding: 20px 0;">
    <font color="#b5a595" size="1" style="letter-spacing: 2px;">ＮＯＡＨＬ ( ノアル )</font>
  </td></tr>
</table>`;
}

function generateBlockHtml(block: Block): string {
  switch (block.type) {
    case "header":
      return generateHeaderHtml(block.props);
    case "banner":
      return generateBannerHtml(block.props);
    case "message":
      return generateMessageHtml(block.props);
    case "productSingle":
      return generateProductSingleHtml(block.props);
    case "productGrid":
      return generateProductGridHtml(block.props);
    case "ctaButton":
      return generateCtaButtonHtml(block.props);
    case "couponButton":
      return generateCouponButtonHtml(block.props);
    case "divider":
      return generateDividerHtml();
    case "textLink":
      return generateTextLinkHtml(block.props);
    case "footer":
      return generateFooterHtml(block.props);
    default:
      return "";
  }
}

export function generateFullHtml(blocks: Block[]): string {
  const bodyContent = blocks.map((b) => generateBlockHtml(b)).join("\n\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NOAHL メールマガジン</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f2ef; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f5f2ef">
  <tr>
    <td align="center">
      <table width="600" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width: 600px; width: 100%;">
        <tr>
          <td>
${bodyContent}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
