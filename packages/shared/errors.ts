import type { ZodError } from "zod";
import type { ErrorCode } from "./constants";

export function errorResponse(
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
) {
  return { error: { code, message, details } };
}

export function validationErrorResponse(error: ZodError) {
  const issues = error.issues.map(({ path, message }) => ({ path: path.map(String), message }));

  return errorResponse("VALIDATION_ERROR", issues[0]?.message ?? "Invalid input", { issues });
}
