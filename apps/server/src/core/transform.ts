import { readDotPath, type JsonValue, type Step } from "@flowlet/shared";

export function executeTransform(
  step: Extract<Step, { type: "transform" }>,
  data: JsonValue,
): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(step.mapping).map(([key, path]) => [key, readDotPath(data, path) ?? null]),
  );
}
