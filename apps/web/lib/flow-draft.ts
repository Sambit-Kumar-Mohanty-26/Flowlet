import type { Flow, Step } from "@flowlet/shared";
import type { FieldIssue } from "./api";

interface MappingRow {
  id: string;
  key: string;
  path: string;
}

export type DraftStep =
  | { id: string; type: "filter"; field: string; operator: string; value: string }
  | { id: string; type: "transform"; mapping: MappingRow[] }
  | { id: string; type: "http_request"; url: string; method: string };

export function newStep(type: Step["type"], id: string): DraftStep {
  switch (type) {
    case "filter":
      return { id, type, field: "", operator: "eq", value: "" };
    case "transform":
      return { id, type, mapping: [{ id: "first", key: "", path: "" }] };
    case "http_request":
      return { id, type, url: "", method: "POST" };
  }
}

export function initialSteps(flow?: Pick<Flow, "steps">): DraftStep[] {
  return flow?.steps.map((step, index) => {
    const id = String(index);
    switch (step.type) {
      case "filter":
        return { ...step, id, value: JSON.stringify(step.value) };
      case "transform":
        return { id, type: step.type, mapping: Object.entries(step.mapping).map(
          ([key, path], index) => ({ id: String(index), key, path }),
        ) };
      case "http_request":
        return { ...step, id };
    }
  }) ?? [newStep("filter", "first")];
}

export function serializeSteps(draft: DraftStep[], issues: FieldIssue[]) {
  return draft.map((step, index) => {
    const path = ["steps", String(index)];
    switch (step.type) {
      case "filter": {
        let value: unknown = null;
        try {
          value = JSON.parse(step.value);
        } catch {
          issues.push({ path: [...path, "value"], message: 'Enter JSON, such as 1000, true, or "paid".' });
        }
        return { type: step.type, field: step.field, operator: step.operator, value };
      }
      case "transform": {
        const seen = new Set<string>();
        for (const [index, row] of step.mapping.entries()) {
          if (!row.key.trim() || seen.has(row.key)) {
            issues.push({
              path: [...path, "mappingRows", String(index), "key"],
              message: row.key.trim() ? "Use a unique output field." : "Enter an output field.",
            });
          }
          seen.add(row.key);
        }
        return { type: step.type, mapping: Object.fromEntries(step.mapping.map(({ key, path }) => [key, path])) };
      }
      case "http_request":
        return { type: step.type, method: step.method, url: step.url };
    }
  });
}
