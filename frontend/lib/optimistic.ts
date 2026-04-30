"use client";

import { useEffect, useState } from "react";
import type { MailOutput, Template } from "./types";

const KEY_OUTPUT_OVERRIDES = "noahl-output-overrides";
const KEY_OUTPUT_DELETED = "noahl-output-deleted";
const KEY_TEMPLATE_OVERRIDES = "noahl-template-overrides";
const KEY_TEMPLATE_DELETED = "noahl-template-deleted";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** 編集後の上書きを保存 */
export function setOutputOverride(id: string, overrides: Partial<MailOutput>) {
  const all = readJSON<Record<string, Partial<MailOutput>>>(
    KEY_OUTPUT_OVERRIDES,
    {},
  );
  all[id] = { ...all[id], ...overrides };
  writeJSON(KEY_OUTPUT_OVERRIDES, all);
}

/** 削除をマーク */
export function markOutputDeleted(id: string) {
  const all = readJSON<string[]>(KEY_OUTPUT_DELETED, []);
  if (!all.includes(id)) all.push(id);
  writeJSON(KEY_OUTPUT_DELETED, all);
}

export function setTemplateOverride(
  id: string,
  overrides: Partial<Template>,
) {
  const all = readJSON<Record<string, Partial<Template>>>(
    KEY_TEMPLATE_OVERRIDES,
    {},
  );
  all[id] = { ...all[id], ...overrides };
  writeJSON(KEY_TEMPLATE_OVERRIDES, all);
}

export function markTemplateDeleted(id: string) {
  const all = readJSON<string[]>(KEY_TEMPLATE_DELETED, []);
  if (!all.includes(id)) all.push(id);
  writeJSON(KEY_TEMPLATE_DELETED, all);
}

/** 単一 output の overlay 適用 */
export function useOptimisticOutput(
  initial: MailOutput,
): { data: MailOutput; isDeleted: boolean } {
  const [overrides, setOverrides] = useState<Partial<MailOutput>>({});
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const all = readJSON<Record<string, Partial<MailOutput>>>(
      KEY_OUTPUT_OVERRIDES,
      {},
    );
    setOverrides(all[initial.id] ?? {});
    const deleted = readJSON<string[]>(KEY_OUTPUT_DELETED, []);
    setIsDeleted(deleted.includes(initial.id));
  }, [initial.id]);

  return {
    data: { ...initial, ...overrides, id: initial.id },
    isDeleted,
  };
}

/**
 * サーバーが override に追いついたら、その override を捨てる。
 * - 各フィールドについてサーバー値と override 値を JSON 比較
 * - 一致しているフィールドはサーバーが既に反映済みなので削除
 * - すべてのフィールドが追いついた id は override 自体を削除
 * - 結果が変わったら localStorage を書き戻す
 */
function pruneOutputOverrides(
  initial: MailOutput[],
): Record<string, Partial<MailOutput>> {
  const overrides = readJSON<Record<string, Partial<MailOutput>>>(
    KEY_OUTPUT_OVERRIDES,
    {},
  );
  const cleaned: Record<string, Partial<MailOutput>> = {};
  let changed = false;
  for (const [id, partial] of Object.entries(overrides)) {
    const server = initial.find((o) => o.id === id);
    if (!server) {
      changed = true;
      continue;
    }
    const fresh: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(partial)) {
      const sv = (server as unknown as Record<string, unknown>)[k];
      if (JSON.stringify(sv) === JSON.stringify(v)) {
        changed = true;
      } else {
        fresh[k] = v;
      }
    }
    if (Object.keys(fresh).length > 0) {
      cleaned[id] = fresh as Partial<MailOutput>;
    } else {
      changed = true;
    }
  }
  if (changed) writeJSON(KEY_OUTPUT_OVERRIDES, cleaned);
  return cleaned;
}

/** outputs 一覧の overlay 適用 */
export function useOptimisticOutputs(initial: MailOutput[]): MailOutput[] {
  const [merged, setMerged] = useState<MailOutput[]>(initial);

  useEffect(() => {
    const overrides = pruneOutputOverrides(initial);
    const deleted = new Set(readJSON<string[]>(KEY_OUTPUT_DELETED, []));
    const result = initial
      .filter((o) => !deleted.has(o.id))
      .map((o) =>
        overrides[o.id] ? { ...o, ...overrides[o.id], id: o.id } : o,
      );
    setMerged(result);
  }, [initial]);

  return merged;
}

export function useOptimisticTemplate(
  initial: Template,
): { data: Template; isDeleted: boolean } {
  const [overrides, setOverrides] = useState<Partial<Template>>({});
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const all = readJSON<Record<string, Partial<Template>>>(
      KEY_TEMPLATE_OVERRIDES,
      {},
    );
    setOverrides(all[initial.id] ?? {});
    const deleted = readJSON<string[]>(KEY_TEMPLATE_DELETED, []);
    setIsDeleted(deleted.includes(initial.id));
  }, [initial.id]);

  return {
    data: { ...initial, ...overrides, id: initial.id },
    isDeleted,
  };
}

export function useOptimisticTemplates(initial: Template[]): Template[] {
  const [merged, setMerged] = useState<Template[]>(initial);

  useEffect(() => {
    const overrides = readJSON<Record<string, Partial<Template>>>(
      KEY_TEMPLATE_OVERRIDES,
      {},
    );
    const deleted = new Set(readJSON<string[]>(KEY_TEMPLATE_DELETED, []));
    const result = initial
      .filter((t) => !deleted.has(t.id))
      .map((t) =>
        overrides[t.id] ? { ...t, ...overrides[t.id], id: t.id } : t,
      );
    setMerged(result);
  }, [initial]);

  return merged;
}

/** localStorage を全部クリア（サーバー側に反映完了したら） */
export function clearOptimisticAll() {
  writeJSON(KEY_OUTPUT_OVERRIDES, {});
  writeJSON(KEY_OUTPUT_DELETED, []);
  writeJSON(KEY_TEMPLATE_OVERRIDES, {});
  writeJSON(KEY_TEMPLATE_DELETED, []);
}
