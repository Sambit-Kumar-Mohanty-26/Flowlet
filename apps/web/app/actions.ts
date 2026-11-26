"use server";

import { createHmac } from "node:crypto";
import { jsonValueSchema, type Flow, type RunStatus } from "@flowlet/shared";
import { revalidatePath } from "next/cache";
import { ApiError, apiRequest, flowPath, hookPath, readFlow, readHistory } from "../lib/api";

const jsonHeaders = { "Content-Type": "application/json" };

function failure(error: unknown) {
  return {
    ok: false as const,
    message: error instanceof ApiError ? error.message : "The request could not be completed.",
    issues: error instanceof ApiError ? error.issues : [],
  };
}

export async function saveFlow(id: string | null, input: unknown) {
  try {
    const flow = await apiRequest<Flow>(id === null ? "/api/flows" : flowPath(id), {
      method: id === null ? "POST" : "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
    revalidatePath("/", "layout");
    return { ok: true as const, id: flow.id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteFlow(id: string) {
  try {
    await apiRequest<void>(flowPath(id), { method: "DELETE" });
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function sendTestEvent(id: string, body: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return failure(new ApiError(400, "Enter valid JSON."));
  }
  if (!jsonValueSchema.safeParse(payload).success) {
    return failure(new ApiError(400, "Enter a valid JSON value."));
  }

  try {
    const flow = await readFlow(id);
    const signature = createHmac("sha256", flow.webhookSecret).update(body).digest("hex");
    const run = await apiRequest<{ runId: string; status: RunStatus }>(hookPath(flow.id), {
      method: "POST",
      headers: { ...jsonHeaders, "X-Flowlet-Signature": `sha256=${signature}` },
      body,
    });
    revalidatePath("/flows");
    revalidatePath(`/flows/${flow.id}`);
    return { ok: true as const, run };
  } catch (error) {
    return failure(error);
  }
}

export async function loadRunHistory(id: string, status?: RunStatus, cursor?: string) {
  try {
    return { ok: true as const, page: await readHistory(id, { status, cursor }) };
  } catch (error) {
    return failure(error);
  }
}
