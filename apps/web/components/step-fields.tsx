import { FILTER_OPERATORS, HTTP_METHODS } from "@flowlet/shared";
import type { ReactNode } from "react";
import type { DraftStep } from "../lib/flow-draft";

export function Field({ label, name, error, children }: {
  label: string;
  name: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <span className="field-error" id={`${name}-error`}>{error}</span>}
    </div>
  );
}

export function StepFields({ step, index, update, errorAt }: {
  step: DraftStep;
  index: number;
  update: (draft: DraftStep) => void;
  errorAt: (...path: string[]) => string | undefined;
}) {
  const id = `step-${index + 1}`;
  function field(name: string, ...path: string[]) {
    const error = errorAt(...path);
    const inputId = `${id}-${name}`;
    return {
      id: inputId,
      error,
      accessibility: { "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${inputId}-error` : undefined },
    };
  }

  switch (step.type) {
    case "filter": {
      const key = field("field", "field");
      const operator = field("operator", "operator");
      const value = field("value", "value");
      return (
        <div className="field-grid filter-fields">
          <Field label="Field path" name={key.id} error={key.error}>
            <input className="mono" id={key.id} value={step.field} placeholder="order.amount" {...key.accessibility}
              onChange={(event) => update({ ...step, field: event.target.value })} />
          </Field>
          <Field label="Operator" name={operator.id} error={operator.error}>
            <select id={operator.id} value={step.operator} {...operator.accessibility}
              onChange={(event) => update({ ...step, operator: event.target.value })}>
              {FILTER_OPERATORS.map((operator) => <option key={operator}>{operator}</option>)}
            </select>
          </Field>
          <Field label="Value (JSON)" name={value.id} error={value.error}>
            <input className="mono" id={value.id} value={step.value} placeholder="1000" {...value.accessibility}
              onChange={(event) => update({ ...step, value: event.target.value })} />
          </Field>
        </div>
      );
    }
    case "transform": {
      return (
        <div className="step-fields">
          {errorAt("mapping") && <span className="field-error">{errorAt("mapping")}</span>}
          {step.mapping.map((row, index) => {
            const key = field(`mapping-key-${index}`, "mappingRows", String(index), "key");
            const path = field(`mapping-path-${index}`, "mapping", row.key);
            return (
              <div className="field-grid mapping-row" key={row.id}>
                <Field label="Output field" name={key.id} error={key.error}>
                  <input className="mono" id={key.id} value={row.key} placeholder="total" {...key.accessibility}
                    onChange={(event) => update({ ...step, mapping: step.mapping.map((item) =>
                      item.id === row.id ? { ...item, key: event.target.value } : item) })} />
                </Field>
                <Field label="Input path" name={path.id} error={path.error}>
                  <input className="mono" id={path.id} value={row.path} placeholder="order.amount" {...path.accessibility}
                    onChange={(event) => update({ ...step, mapping: step.mapping.map((item) =>
                      item.id === row.id ? { ...item, path: event.target.value } : item) })} />
                </Field>
                <button className="button small" type="button" aria-label={`Remove mapping ${index + 1}`}
                  onClick={() => update({ ...step, mapping: step.mapping.filter((item) => item.id !== row.id) })}>
                  Remove
                </button>
              </div>
            );
          })}
          <button className="button small align-start" type="button" onClick={() => update({
            ...step, mapping: [...step.mapping, { id: crypto.randomUUID(), key: "", path: "" }],
          })}>Add mapping</button>
        </div>
      );
    }
    case "http_request": {
      const method = field("method", "method");
      const url = field("url", "url");
      return (
        <div className="field-grid http-fields">
          <Field label="Method" name={method.id} error={method.error}>
            <select id={method.id} value={step.method} {...method.accessibility}
              onChange={(event) => update({ ...step, method: event.target.value })}>
              {HTTP_METHODS.map((method) => <option key={method}>{method}</option>)}
            </select>
          </Field>
          <Field label="URL" name={url.id} error={url.error}>
            <input className="mono" id={url.id} value={step.url} placeholder="http://localhost:4000/api/mock/receiver"
              {...url.accessibility} onChange={(event) => update({ ...step, url: event.target.value })} />
          </Field>
        </div>
      );
    }
  }
}
