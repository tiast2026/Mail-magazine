/**
 * GitHub API ヘルパー
 * リポジトリ内のファイルを Web 経由で編集するために使用。
 *
 * 必要な環境変数:
 *   GITHUB_TOKEN: Fine-grained PAT（Contents: Read and write 権限）
 *   WRITE_BRANCH: 書き込み先ブランチ（デフォルト "main"）
 */

const OWNER = "tiast2026";
const REPO = "Mail-magazine";

function getBranch(): string {
  // 1. WRITE_BRANCH が明示指定されればそれを使う
  // 2. VERCEL_GIT_COMMIT_REF（Vercel が現在の deployment のために使ったブランチ）を使う
  //    → Production URL なら Production Branch、Preview URL なら Preview Branch に書き込む
  //    これで「書いた直後にすぐ Vercel が再ビルドして反映」される
  // 3. ローカル開発時のフォールバックとして main
  return (
    process.env.WRITE_BRANCH ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    "main"
  );
}

function getToken(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) {
    throw new Error(
      "GITHUB_TOKEN が設定されていません。Vercel 環境変数で設定してください。",
    );
  }
  return t;
}

async function ghFetch(
  path: string,
  init?: RequestInit & { searchParams?: Record<string, string> },
): Promise<Response> {
  const url = new URL(`https://api.github.com/repos/${OWNER}/${REPO}${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

export async function getFile(
  filePath: string,
): Promise<{ content: string; sha: string }> {
  const res = await ghFetch(`/contents/${filePath}`, {
    searchParams: { ref: getBranch() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ファイル読み取り失敗 (${filePath}): ${res.status} ${text}`,
    );
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    throw new Error(`${filePath} はディレクトリです`);
  }
  if (typeof data.sha !== "string") {
    throw new Error(`${filePath} のメタデータが不正です`);
  }
  // 1MB 以下: content フィールドに base64 で入っている
  if (data.encoding === "base64" && typeof data.content === "string" && data.content.length > 0) {
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return { content, sha: data.sha };
  }
  // 1MB 超のファイル: Contents API は content を空で返すので Git Blobs API で取得
  // （download_url はキャッシュ遅延があるため使わず、SHA から直接 blob を引く）
  const blobRes = await ghFetch(`/git/blobs/${data.sha}`);
  if (!blobRes.ok) {
    const text = await blobRes.text();
    throw new Error(
      `Large file blob 読み取り失敗 (${filePath}): ${blobRes.status} ${text}`,
    );
  }
  const blob = await blobRes.json();
  if (blob.encoding !== "base64" || typeof blob.content !== "string") {
    throw new Error(`${filePath} の blob レスポンスが不正です`);
  }
  const content = Buffer.from(blob.content, "base64").toString("utf8");
  return { content, sha: data.sha };
}

export async function updateFile(
  filePath: string,
  newContent: string,
  commitMessage: string,
  sha: string,
): Promise<void> {
  const res = await ghFetch(`/contents/${filePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(newContent, "utf8").toString("base64"),
      sha,
      branch: getBranch(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `ファイル更新失敗 (${filePath}): ${res.status} ${text}`,
    );
  }
}

/**
 * JSON ファイルを読み取って加工 → 書き戻すヘルパー
 */
export async function updateJsonFile<T>(
  filePath: string,
  modifier: (current: T) => T,
  commitMessage: string,
): Promise<void> {
  const { content, sha } = await getFile(filePath);
  const parsed = JSON.parse(content) as T;
  const next = modifier(parsed);
  const newContent = JSON.stringify(next, null, 2) + "\n";
  await updateFile(filePath, newContent, commitMessage, sha);
}
