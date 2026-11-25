import { randomBytes } from "node:crypto";
import type { CreateFlow, Flow, FlowSummary, UpdateFlow } from "@flowlet/shared";
import { ObjectId, type Collection, type Db } from "mongodb";

interface FlowDocument extends CreateFlow {
  _id: ObjectId;
  webhookSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

type FlowListDocument = Pick<FlowDocument, "_id" | "name" | "description" | "enabled" | "createdAt">;

const FLOW_LIST_LIMIT = 100;
const newestFirst = { createdAt: -1, _id: -1 } as const;
const listProjection = { _id: 1, name: 1, description: 1, enabled: 1, createdAt: 1 } satisfies Record<keyof FlowListDocument, 1>;

export function isFlowId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

function parseFlowId(id: string): ObjectId | null {
  return isFlowId(id) ? new ObjectId(id) : null;
}

function toSummary(flow: FlowListDocument): FlowSummary {
  return {
    id: flow._id.toHexString(),
    name: flow.name,
    description: flow.description,
    enabled: flow.enabled,
    createdAt: flow.createdAt.toISOString(),
  };
}

function toFlow(flow: FlowDocument): Flow {
  return {
    ...toSummary(flow),
    steps: flow.steps,
    webhookSecret: flow.webhookSecret,
    updatedAt: flow.updatedAt.toISOString(),
  };
}

export class FlowStore {
  private readonly flows: Collection<FlowDocument>;

  constructor(db: Db) {
    this.flows = db.collection<FlowDocument>("flows", { ignoreUndefined: true });
  }

  async ensureIndexes(): Promise<void> {
    await this.flows.createIndex(newestFirst, { name: "idx_flows_created_id" });
  }

  async list(): Promise<FlowSummary[]> {
    const flows = await this.flows.find<FlowListDocument>({}, { projection: listProjection })
      .sort(newestFirst)
      .limit(FLOW_LIST_LIMIT)
      .toArray();
    return flows.map(toSummary);
  }

  async create(input: CreateFlow): Promise<Flow> {
    const now = new Date();
    const flow: FlowDocument = {
      ...input,
      _id: new ObjectId(),
      webhookSecret: randomBytes(32).toString("hex"),
      createdAt: now,
      updatedAt: now,
    };
    await this.flows.insertOne(flow);
    return toFlow(flow);
  }

  async get(id: string): Promise<Flow | null> {
    const _id = parseFlowId(id);
    if (!_id) return null;

    const flow = await this.flows.findOne({ _id });
    return flow && toFlow(flow);
  }

  async update(id: string, patch: UpdateFlow): Promise<Flow | null> {
    const _id = parseFlowId(id);
    if (!_id) return null;

    const flow = await this.flows.findOneAndUpdate(
      { _id },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return flow && toFlow(flow);
  }

  async delete(id: string): Promise<boolean> {
    const _id = parseFlowId(id);
    if (!_id) return false;

    const result = await this.flows.deleteOne({ _id });
    return result.deletedCount === 1;
  }
}
