import type { z } from "zod";
import type { RUN_STATUSES, STEP_STATUSES } from "./constants";
import type { createFlowSchema, jsonValueSchema, stepSchema, updateFlowSchema } from "./schemas";

export type Step = z.infer<typeof stepSchema>;
export type CreateFlow = z.infer<typeof createFlowSchema>;
export type UpdateFlow = z.infer<typeof updateFlowSchema>;
export type JsonValue = z.infer<typeof jsonValueSchema>;
export type RunStatus = (typeof RUN_STATUSES)[number];
export type StepStatus = (typeof STEP_STATUSES)[number];

export interface FlowSummary {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
}

export interface Flow extends FlowSummary {
  steps: Step[];
  webhookSecret: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  flowId: string;
  status: RunStatus;
  payload: JsonValue;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  error: string | null;
}

export interface RunStep {
  position: number;
  type: Step["type"];
  status: StepStatus;
  input: JsonValue;
  output: JsonValue;
  error: string | null;
  durationMs: number | null;
}
