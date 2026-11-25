import { MongoClient } from "mongodb";

export function createMongoClient(uri = process.env.MONGODB_URI): MongoClient {
  if (!uri) throw new Error("MONGODB_URI is required");
  return new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
}
