# Flowlet

Flowlet is a webhook automation console. Create a flow with up to five filter, transform, or HTTP request steps, then send a signed JSON event to its webhook. The console shows each run's input, output, timing, and outcome.

## Run locally

Install Bun and Docker with Docker Compose, then run these commands from the repository root.

```bash
cp .env.example .env
docker compose up -d
bun install
bun run migrate
bun run dev
bun test
```

Keep `bun run dev` running and run `bun test` in a second terminal. Open [the web console](http://localhost:3000/flows). The API listens on port `4000`. The default local database ports are `27017` for MongoDB and `5433` for PostgreSQL.

To try the app, create a filter such as `order.amount gt 1000`, then send `{"order":{"amount":4999}}` from the flow detail page. The console signs the request on the server. Open the saved run to see the filter's input and result.

Run `bun run typecheck` for all workspaces. With PostgreSQL running and migrated, use `FLOWLET_TEST_POSTGRES=1 bun test` to include the database integration test.

## Code organization

| Path | Responsibility |
| --- | --- |
| `apps/server/src/routes/` | Bun and Hono API handlers, runtime validation, and response formatting |
| `apps/server/src/core/` | Signature verification and the sequential step engine |
| `apps/server/src/db/` | MongoDB flow storage, PostgreSQL run storage, and migration tooling |
| `apps/web/` | Next.js App Router console, form components, and server actions |
| `packages/shared/` | Domain types, Zod schemas, and API error format |
| `migrations/` | Ordered PostgreSQL schema and index definitions |

The step engine can run with a provided fetch function, so tests exercise HTTP behavior without opening database connections or depending on outside services.

## Status and limitations

The required flow CRUD, signed webhooks, three step types, run history and stats, and responsive web console are implemented. The project includes the mock receiver, idempotent SQL migrations, and tests for validation, execution, and pagination. The optional extras are out of scope for this submission.

The startup sequence was verified from a fresh clone with empty database volumes. The signed order example succeeded at 4999 and skipped the later steps at 500. Type checking, all 59 default tests, the PostgreSQL integration test, and the browser workflow at 375 px passed.

The console has no user authentication and is intended for local, single-user use. Incoming webhook requests still require a valid signature. The flow list returns the newest 100 definitions.

HTTP steps make one attempt with a five-second timeout and have no retry or backoff. They accept configured HTTP and HTTPS destinations, including the local mock receiver. For a public deployment, outbound requests would need destination controls to prevent access to private services. PostgreSQL can roll back history writes when persistence fails. Requests already sent to external services can still have effects.

## Time and AI tools

Total time spent was **12 hours**. I used OpenAI Codex to help implement, test, troubleshoot, and document the project. I used Piper with an Indian English voice model to generate narration for the demo.

## Design questions

### Why do flows fit MongoDB and runs fit PostgreSQL? Would you choose differently?

A flow is usually read and edited as a whole. Its ordered steps have different configuration shapes, so they fit naturally as embedded documents.
Runs have a common record shape and a one-to-many relationship with step results. PostgreSQL enforces that relationship and computes summary statistics in SQL.
For a small standalone service, I would also consider storing flows in PostgreSQL with a JSONB steps column to operate one database.

### Which indexes did you create and what queries use them?

MongoDB's `idx_flows_created_id` supports the bounded flow list ordered by creation time and ObjectId.
PostgreSQL's `idx_runs_flow_started_id` supports the run list by flow ID, then descending start time and run ID.
The unique `idx_run_steps_run_position` supports reading a run's timeline in order and prevents duplicate step positions within that run.

### What happens if the same event is delivered twice?

Each accepted delivery runs independently and receives its own run ID.
If the flow includes an HTTP step, both deliveries can send a request, so a downstream side effect can happen twice.
Deduplication would need a stable event ID and a reliable way to claim it before executing steps.

### What happens to run history when a flow is deleted?

Deleting a flow removes its definition from MongoDB and retires its webhook. Its PostgreSQL history stays available by run ID.
The flow-scoped list and stats require an existing definition, so those URLs return 404 after deletion.
Keeping independent run records preserves evidence of earlier executions, even after a workflow has been retired.

### What would break first at 100 events per second, and what would you change?

Slow downstream HTTP calls would build up concurrent requests because each webhook waits for every step to finish.
The database pool is acquired after execution. Bursts of completed runs could still create a write bottleneck while open requests consume memory and sockets.
I would measure those limits, bound concurrency, and consider a queue with workers. That would change the current synchronous contract to an accepted response followed by status retrieval.
