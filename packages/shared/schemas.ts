import { z } from "zod";
import {
  FILTER_OPERATORS,
  FLOW_NAME_MAX,
  FLOW_NAME_MIN,
  FLOW_STEPS_MAX,
  FLOW_STEPS_MIN,
  HTTP_METHODS,
  RUN_STATUSES,
} from "./constants";
import { isSafeDotPath, isSafeKey } from "./dot-path";

const dotPathSchema = z.string().refine(isSafeDotPath, {
  error: "Enter a dot path without empty or reserved segments",
});

const jsonSchema = z.json();
// Zod's object parsing can drop keys such as __proto__ from literal JSON values.
export const jsonValueSchema = z.custom<z.infer<typeof jsonSchema>>(
  (value) => jsonSchema.safeParse(value).success,
  { error: "Enter a JSON value" },
);

export const filterStepSchema = z.strictObject({
  type: z.literal("filter"),
  field: dotPathSchema,
  operator: z.enum(FILTER_OPERATORS),
  value: jsonValueSchema,
});

const mappingSchema = z
  .unknown()
  .refine(
    (value) => typeof value !== "object" || value === null || Object.keys(value).every(isSafeKey),
    { error: "Mapping keys cannot use reserved names" },
  )
  .pipe(z.record(z.string(), dotPathSchema));

export const transformStepSchema = z.strictObject({
  type: z.literal("transform"),
  mapping: mappingSchema,
});

export const httpRequestStepSchema = z.strictObject({
  type: z.literal("http_request"),
  url: z.url({ protocol: /^https?$/, error: "Enter a valid HTTP or HTTPS URL" }),
  method: z.enum(HTTP_METHODS),
});

export const stepSchema = z.discriminatedUnion("type", [
  filterStepSchema,
  transformStepSchema,
  httpRequestStepSchema,
]);

const flowFields = z.strictObject({
  name: z.string().trim()
    .min(FLOW_NAME_MIN, `Name must be at least ${FLOW_NAME_MIN} characters`)
    .max(FLOW_NAME_MAX, `Name must be at most ${FLOW_NAME_MAX} characters`),
  description: z.string().optional(),
  enabled: z.boolean(),
  steps: z.array(stepSchema)
    .min(FLOW_STEPS_MIN, "Add at least one step")
    .max(FLOW_STEPS_MAX, `Add at most ${FLOW_STEPS_MAX} steps`),
});

export const createFlowSchema = flowFields.extend({
  enabled: flowFields.shape.enabled.default(true),
});

export const updateFlowSchema = flowFields.partial();

export const runListQuerySchema = z.strictObject({
  status: z.enum(RUN_STATUSES).optional(),
  limit: z.string()
    .regex(/^[1-9][0-9]{0,2}$/, "Limit must be an integer from 1 to 100")
    .transform(Number)
    .pipe(z.number().max(100, "Limit must be at most 100"))
    .optional()
    .transform((limit) => limit ?? 20),
  cursor: z.string().min(1).max(60).optional(),
});
