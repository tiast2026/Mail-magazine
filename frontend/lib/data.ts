import templates from "@/data/templates.json";
import outputs from "@/data/outputs.json";
import type { Template, MailOutput } from "./types";

export function getTemplates(): Template[] {
  return templates as Template[];
}

export function getTemplate(id: string): Template | undefined {
  return getTemplates().find((t) => t.id === id);
}

export function getOutputs(): MailOutput[] {
  return (outputs as MailOutput[]).slice().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getOutput(id: string): MailOutput | undefined {
  return getOutputs().find((o) => o.id === id);
}
