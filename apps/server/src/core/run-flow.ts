import type { Flow, JsonValue, Run, RunStep, Step } from "@flowlet/shared";
import { executeFilter } from "./filter";
import { executeHttpRequest, type FetchRequest } from "./http-request";
import { executeTransform } from "./transform";

type RunResult = Omit<Run, "id" | "flowId" | "payload"> & { steps: RunStep[] };

async function executeStep(step: Step, data: JsonValue, fetchRequest: FetchRequest) {
  switch (step.type) {
    case "filter":
      return { output: executeFilter(step, data), error: null };
    case "transform":
      return { output: executeTransform(step, data), error: null };
    case "http_request":
      return executeHttpRequest(step, data, fetchRequest);
  }
}

export async function runFlow(
  flow: Pick<Flow, "steps">,
  payload: JsonValue,
  fetchRequest: FetchRequest = fetch,
): Promise<RunResult> {
  const startedAt = new Date();
  const start = performance.now();
  const steps: RunStep[] = [];
  let data = payload;
  let status: Run["status"] = "success";
  let runError: string | null = null;

  for (const [position, step] of flow.steps.entries()) {
    if (status !== "success") {
      steps.push({
        position, type: step.type, status: "skipped",
        input: null, output: null, error: null, durationMs: null,
      });
      continue;
    }

    const stepStart = performance.now();
    const { output, error } = await executeStep(step, data, fetchRequest);
    steps.push({
      position, type: step.type, status: error ? "failed" : "success",
      input: data, output, error, durationMs: Math.round(performance.now() - stepStart),
    });

    if (error) {
      status = "failed";
      runError = error;
    } else if (step.type === "filter" && output === false) {
      status = "filtered";
    } else if (step.type === "transform") {
      data = output;
    }
  }

  return {
    status, steps, error: runError,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - start),
  };
}
