"use client";

import { createFlowSchema, FLOW_STEPS_MAX, type Flow, type Step } from "@flowlet/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveFlow } from "../app/actions";
import type { FieldIssue } from "../lib/api";
import { initialSteps, newStep, serializeSteps, type DraftStep } from "../lib/flow-draft";
import { Field, StepFields } from "./step-fields";

type EditableFlow = Pick<Flow, "id" | "name" | "description" | "enabled" | "steps">;
const stepLabels: Record<Step["type"], string> = {
  filter: "Filter",
  transform: "Transform",
  http_request: "HTTP request",
};

export function FlowForm({ flow }: { flow?: EditableFlow }) {
  const router = useRouter();
  const [name, setName] = useState(flow?.name ?? "");
  const [description, setDescription] = useState(flow?.description ?? "");
  const [enabled, setEnabled] = useState(flow?.enabled ?? true);
  const [steps, setSteps] = useState(() => initialSteps(flow));
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  function errorAt(...path: string[]) {
    return issues.find((issue) => issue.path.length === path.length &&
      issue.path.every((part, index) => part === path[index]))?.message;
  }

  function updateSteps(next: DraftStep[]) {
    setSteps(next);
    setIssues((current) => current.filter(({ path }) => path[0] !== "steps"));
  }

  function move(index: number, offset: number) {
    const next = [...steps];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    updateSteps(next);
  }

  function submit() {
    if (pending) return;

    const localIssues: FieldIssue[] = [];
    const parsed = createFlowSchema.safeParse({
      name, description: description || (flow?.description ? "" : undefined), enabled,
      steps: serializeSteps(steps, localIssues),
    });
    if (!parsed.success) {
      localIssues.push(...parsed.error.issues.map(({ path, message }) => ({ path: path.map(String), message })));
    }
    if (!parsed.success || localIssues.length) {
      setIssues(localIssues);
      setFeedback("Review the highlighted fields.");
      return;
    }

    setIssues([]);
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await saveFlow(flow?.id ?? null, parsed.data);
        if (result.ok) {
          router.push(`/flows/${result.id}`);
        } else {
          setIssues(result.issues);
          setFeedback(result.message);
        }
      } catch {
        setFeedback("The flow could not be saved.");
      }
    });
  }

  const nameError = errorAt("name");
  const descriptionError = errorAt("description");
  return (
    <form className="page-stack" action={submit} noValidate>
      {feedback && <p className="feedback" role="alert">{feedback}</p>}
      <fieldset className="form-fields" disabled={pending}>
        <section className="panel section">
          <h2>General</h2>
          <div className="field-grid general-fields">
            <Field label="Flow name" name="flow-name" error={nameError}>
              <input id="flow-name" value={name} placeholder="High value orders"
                aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "flow-name-error" : undefined}
                onChange={(event) => setName(event.target.value)} />
            </Field>
            <label className="checkbox"><input type="checkbox" checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)} /> Enabled</label>
          </div>
          <Field label="Description (optional)" name="flow-description" error={descriptionError}>
            <textarea id="flow-description" rows={2} value={description}
              aria-invalid={Boolean(descriptionError)} aria-describedby={descriptionError ? "flow-description-error" : undefined}
              onChange={(event) => setDescription(event.target.value)} />
          </Field>
        </section>

        <section className="panel section">
          <div className="section-heading">
            <div><h2>Steps</h2><p className="secondary">{steps.length} / {FLOW_STEPS_MAX} steps</p></div>
            <button className="button small" type="button" disabled={steps.length >= FLOW_STEPS_MAX}
              onClick={() => updateSteps([...steps, newStep("filter", crypto.randomUUID())])}>Add step</button>
          </div>
          {errorAt("steps") && <p className="field-error">{errorAt("steps")}</p>}
          {!steps.length && <p className="muted inset">No steps yet. Add a step to define what this flow does.</p>}
          <ol className="editor-steps">
            {steps.map((step, index) => (
              <li className="step-editor" key={step.id}>
                <div className="step-editor-header">
                  <Field label={`Step ${index + 1} type`} name={`step-kind-${index}`}>
                    <select id={`step-kind-${index}`} value={step.type}
                      onChange={(event) => updateSteps(steps.map((item) =>
                        item.id === step.id ? newStep(event.target.value as Step["type"], step.id) : item))}>
                      {Object.entries(stepLabels).map(([type, label]) => <option value={type} key={type}>{label}</option>)}
                    </select>
                  </Field>
                  <div className="row-actions">
                    <button className="button small" type="button" disabled={index === 0} aria-label={`Move step ${index + 1} up`}
                      onClick={() => move(index, -1)}>Up</button>
                    <button className="button small" type="button" disabled={index === steps.length - 1}
                      aria-label={`Move step ${index + 1} down`} onClick={() => move(index, 1)}>Down</button>
                    <button className="button small" type="button" aria-label={`Remove step ${index + 1}`}
                      onClick={() => updateSteps(steps.filter((item) => item.id !== step.id))}>Remove</button>
                  </div>
                </div>
                <StepFields step={step} index={index} errorAt={(...path) => errorAt("steps", String(index), ...path)}
                  update={(value) => updateSteps(steps.map((item) => item.id === value.id ? value : item))} />
              </li>
            ))}
          </ol>
        </section>

        <div className="row-actions">
          <button className="button primary" type="submit">
            {pending ? "Saving…" : flow ? "Save changes" : "Create flow"}
          </button>
          <Link className="button" href={flow ? `/flows/${flow.id}` : "/flows"}>Cancel</Link>
        </div>
      </fieldset>
    </form>
  );
}
