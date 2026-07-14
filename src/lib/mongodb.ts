// src/lib/mongodb.ts
// Serverless-safe MongoDB connection singleton.
// Reuses the same database your existing backend uses — set MONGODB_URI in the
// environment (Vercel project settings). Optionally set MONGODB_DB to pin a db name.

import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  // Don't throw at import time (keeps builds/prerender from failing when the
  // var isn't present) — the API routes surface a clear error instead.
  console.warn('[mongodb] MONGODB_URI is not set. Family Wall API will return an error until it is configured.');
}

// Cache the client across hot reloads in dev and across warm serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not configured'));
  }
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  // If MONGODB_DB is set use it; otherwise use the default db from the URI.
  const dbName = process.env.MONGODB_DB;
  return dbName ? client.db(dbName) : client.db();
}
