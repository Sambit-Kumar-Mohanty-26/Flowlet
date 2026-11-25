import { errorResponse } from "@flowlet/shared";

const statusByCode = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export class ApiError extends Error {
  constructor(readonly body: ReturnType<typeof errorResponse>) {
    super(body.error.message);
  }

  get status() {
    return statusByCode[this.body.error.code];
  }
}
