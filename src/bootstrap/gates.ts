import { readFile } from "node:fs/promises";
import path from "node:path";

export const BOOTSTRAP_GATES = [
  "architecture",
  "design",
  "data",
  "security",
] as const;

export type BootstrapGate = (typeof BOOTSTRAP_GATES)[number];

export interface BootstrapGateReport {
  ready: boolean;
  gates: Record<BootstrapGate, "pending" | "approved">;
  missing: BootstrapGate[];
}

export async function evaluateBootstrapGates(
  projectRoot: string,
): Promise<BootstrapGateReport> {
  const manifestPath = path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
    "manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    artifacts?: Array<{ id?: string; status?: string }>;
  };
  const gates = Object.fromEntries(
    BOOTSTRAP_GATES.map((id) => {
      const artifact = manifest.artifacts?.find(
        (candidate) => candidate.id === id,
      );
      return [id, artifact?.status === "approved" ? "approved" : "pending"];
    }),
  ) as Record<BootstrapGate, "pending" | "approved">;
  const missing = BOOTSTRAP_GATES.filter((id) => gates[id] !== "approved");
  return { ready: missing.length === 0, gates, missing };
}
