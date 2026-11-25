const blockedKeys = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeKey(key: string): boolean {
  return !blockedKeys.has(key);
}

export function isSafeDotPath(path: string): boolean {
  return path.split(".").every((segment) => segment.length > 0 && isSafeKey(segment));
}

export function readDotPath(data: unknown, path: string): unknown {
  if (!isSafeDotPath(path)) return undefined;

  let value = data;
  for (const segment of path.split(".")) {
    if (typeof value !== "object" || value === null ||
      !Object.prototype.propertyIsEnumerable.call(value, segment)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return value;
}
