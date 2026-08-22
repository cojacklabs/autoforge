import { readBootstrapManifest } from "./manifest.js";

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
  const manifest = await readBootstrapManifest(projectRoot);
  const gates = Object.fromEntries(
    BOOTSTRAP_GATES.map((id) => {
      const artifact = manifest.artifacts.find(
        (candidate) => candidate.id === id,
      );
      return [id, artifact?.status === "approved" ? "approved" : "pending"];
    }),
  ) as Record<BootstrapGate, "pending" | "approved">;
  const missing = BOOTSTRAP_GATES.filter((id) => gates[id] !== "approved");
  return { ready: missing.length === 0, gates, missing };
}
