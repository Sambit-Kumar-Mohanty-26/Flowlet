import type { Flow, FlowSummary, RunDetails, RunPage, RunStats, RunStatus } from "@flowlet/shared";
import { notFound } from "next/navigation";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export interface FieldIssue {
  path: string[];
  message: string;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly issues: FieldIssue[] = []) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl + path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });
  } catch {
    throw new ApiError(503, "Could not reach the Flowlet API.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as {
      error?: { message?: string; details?: { issues?: FieldIssue[] } };
    } | null;
    throw new ApiError(response.status, body?.error?.message ?? "The API request failed.", body?.error?.details?.issues);
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function flowPath(id: string): string {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new ApiError(404, "Flow not found.");
  return `/api/flows/${id}`;
}

export function hookPath(id: string): string {
  flowPath(id);
  return `/api/hooks/${id}`;
}

export function webhookUrl(id: string): string {
  return apiUrl + hookPath(id);
}

export const listFlows = () => apiRequest<FlowSummary[]>("/api/flows");
export const readFlow = (id: string) => apiRequest<Flow>(flowPath(id));
export const readStats = (id: string) => apiRequest<RunStats>(`${flowPath(id)}/stats`);

export function readHistory(id: string, params: { limit?: number; status?: RunStatus; cursor?: string } = {}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.cursor) query.set("cursor", params.cursor);
  return apiRequest<RunPage>(`${flowPath(id)}/runs?${query}`);
}

export async function flowForPage(id: string) {
  try {
    return await readFlow(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function runForPage(id: string) {
  if (!/^[1-9][0-9]{0,18}$/.test(id)) notFound();
  try {
    return await apiRequest<RunDetails>(`/api/runs/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
