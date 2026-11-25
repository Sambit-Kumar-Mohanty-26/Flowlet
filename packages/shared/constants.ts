export const FLOW_NAME_MIN = 3;
export const FLOW_NAME_MAX = 80;
export const FLOW_STEPS_MIN = 1;
export const FLOW_STEPS_MAX = 5;

export const FILTER_OPERATORS = ["eq", "neq", "gt", "lt", "contains"] as const;
export const HTTP_METHODS = ["POST", "PUT"] as const;
export const RUN_STATUSES = ["success", "filtered", "failed"] as const;
export const STEP_STATUSES = ["success", "failed", "skipped"] as const;

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR";
