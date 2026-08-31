import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";

const sizes = process.argv.slice(2).map(Number).filter(Number.isFinite);
const sampleSizes = sizes.length > 0 ? sizes : [1_000, 10_000, 50_000];

function elapsed(operation) {
  const started = performance.now();
  const value = operation();
  return { milliseconds: performance.now() - started, value };
}

function generateProjection(nodeCount) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node.${index}`,
    type: ["work", "decision", "evidence", "specification"][index % 4],
    status: ["planned", "active", "completed"][index % 3],
    label: `Synthetic benchmark node ${index}`,
  }));
  const edges = Array.from({ length: nodeCount * 2 }, (_, index) => ({
    sourceId: `node.${index % nodeCount}`,
    relationship: ["depends-on", "validates", "implements"][index % 3],
    targetId: `node.${(index * 17 + 1) % nodeCount}`,
  }));
  return { schemaVersion: 1, nodes, edges };
}

function benchmark(nodeCount) {
  const directory = mkdtempSync(
    path.join(tmpdir(), "autoforge-storage-benchmark-"),
  );
  try {
    const canonicalPath = path.join(directory, "canonical.json");
    const databasePath = path.join(directory, "projection.sqlite");
    const projection = generateProjection(nodeCount);
    const canonicalWrite = elapsed(() => {
      const serialized = JSON.stringify(projection);
      writeFileSync(canonicalPath, serialized);
      return serialized;
    });
    const sourceFingerprint = createHash("sha256")
      .update(canonicalWrite.value)
      .digest("hex");
    const canonicalRead = elapsed(() =>
      JSON.parse(readFileSync(canonicalPath, "utf8")),
    );
    const linearQueries = elapsed(() => {
      let count = 0;
      for (let iteration = 0; iteration < 200; iteration += 1) {
        count += canonicalRead.value.nodes.filter(
          (node) => node.type === "work" && node.status === "active",
        ).length;
        count += canonicalRead.value.edges.filter(
          (edge) => edge.relationship === "depends-on",
        ).length;
      }
      return count;
    });

    const database = new DatabaseSync(databasePath);
    const sqliteRebuild = elapsed(() => {
      database.exec(`
        PRAGMA journal_mode = DELETE;
        PRAGMA synchronous = NORMAL;
        CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE nodes (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, label TEXT NOT NULL);
        CREATE TABLE edges (source_id TEXT NOT NULL, relationship TEXT NOT NULL, target_id TEXT NOT NULL);
        CREATE INDEX nodes_type_status ON nodes(type, status);
        CREATE INDEX edges_relationship ON edges(relationship);
        CREATE INDEX edges_source ON edges(source_id);
        CREATE INDEX edges_target ON edges(target_id);
      `);
      const insertMetadata = database.prepare(
        "INSERT INTO metadata (key, value) VALUES (?, ?)",
      );
      const insertNode = database.prepare(
        "INSERT INTO nodes (id, type, status, label) VALUES (?, ?, ?, ?)",
      );
      const insertEdge = database.prepare(
        "INSERT INTO edges (source_id, relationship, target_id) VALUES (?, ?, ?)",
      );
      database.exec("BEGIN IMMEDIATE");
      try {
        insertMetadata.run("schemaVersion", "1");
        insertMetadata.run("sourceFingerprint", sourceFingerprint);
        for (const node of projection.nodes) {
          insertNode.run(node.id, node.type, node.status, node.label);
        }
        for (const edge of projection.edges) {
          insertEdge.run(edge.sourceId, edge.relationship, edge.targetId);
        }
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    });
    const nodeQuery = database.prepare(
      "SELECT count(*) AS count FROM nodes WHERE type = ? AND status = ?",
    );
    const edgeQuery = database.prepare(
      "SELECT count(*) AS count FROM edges WHERE relationship = ?",
    );
    const indexedQueries = elapsed(() => {
      let count = 0;
      for (let iteration = 0; iteration < 200; iteration += 1) {
        count += Number(nodeQuery.get("work", "active").count);
        count += Number(edgeQuery.get("depends-on").count);
      }
      return count;
    });
    database.close();
    return {
      nodeCount,
      edgeCount: nodeCount * 2,
      canonicalBytes: statSync(canonicalPath).size,
      sqliteBytes: statSync(databasePath).size,
      canonicalWriteMs: canonicalWrite.milliseconds,
      canonicalReadParseMs: canonicalRead.milliseconds,
      linearQueryPairs200Ms: linearQueries.milliseconds,
      sqliteRebuildMs: sqliteRebuild.milliseconds,
      indexedQueryPairs200Ms: indexedQueries.milliseconds,
      querySpeedup: linearQueries.milliseconds / indexedQueries.milliseconds,
      sourceFingerprint,
      queryCountsMatch: linearQueries.value === indexedQueries.value,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

mkdirSync(tmpdir(), { recursive: true });
console.log(
  JSON.stringify(
    {
      runtime: process.version,
      platform: `${process.platform}-${process.arch}`,
      generatedAt: new Date().toISOString(),
      results: sampleSizes.map(benchmark),
    },
    null,
    2,
  ),
);
