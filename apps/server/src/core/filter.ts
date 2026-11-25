import { readDotPath, type JsonValue, type Step } from "@flowlet/shared";
import { isDeepStrictEqual } from "node:util";

export function executeFilter(step: Extract<Step, { type: "filter" }>, data: JsonValue): boolean {
  const field = readDotPath(data, step.field);
  if (field === undefined) return false;

  switch (step.operator) {
    case "eq":
      return isDeepStrictEqual(field, step.value);
    case "neq":
      return !isDeepStrictEqual(field, step.value);
    case "gt":
      return typeof field === "number" && typeof step.value === "number" && field > step.value;
    case "lt":
      return typeof field === "number" && typeof step.value === "number" && field < step.value;
    case "contains":
      if (typeof field === "string" && typeof step.value === "string") return field.includes(step.value);
      return Array.isArray(field) && field.some((item) => isDeepStrictEqual(item, step.value));
  }
}
