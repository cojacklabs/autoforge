import process from "node:process";
import { createInterface } from "node:readline/promises";

import { createOpenAIAgentModel } from "@cojacklabs/autoforge-providers";
import { AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION } from "@cojacklabs/autoforge-protocol";
import agentPackage from "../package.json" with { type: "json" };

import { NativeCredentialVault, runCredentialCommand } from "./credentials.js";
import { readHiddenInput } from "./hidden-input.js";
import { LocalSdkGateway } from "./local-gateway.js";
import { AiSdkAgentRuntime } from "./runtime.js";
import { runAgentSession, type AgentSessionIo } from "./session.js";
import { LocalAgentWorkspace } from "./workspace.js";

export async function main(
  arguments_ = process.argv.slice(2),
): Promise<number> {
  if (
    arguments_.length === 2 &&
    arguments_[0] === "version" &&
    arguments_[1] === "--json"
  ) {
    process.stdout.write(
      `${JSON.stringify({
        name: "@cojacklabs/autoforge-agent",
        version: agentPackage.version,
        launchProtocolVersion: AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION,
      })}\n`,
    );
    return 0;
  }
  let credentialVault: NativeCredentialVault;
  try {
    credentialVault = await NativeCredentialVault.create();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Credential store unavailable."}\n`,
    );
    return 1;
  }
  if (arguments_[0] === "credentials") {
    return runCredentialCommand(arguments_.slice(1), credentialVault, {
      write: (value) => process.stdout.write(value),
      readSecret: readHiddenInput,
    });
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write("autoforge-agent requires an interactive terminal.\n");
    return 2;
  }
  const apiKey = await credentialVault.get("openai");
  if (!apiKey) {
    process.stderr.write(
      "No OpenAI credential is configured. Run: autoforge-agent credentials set openai\n",
    );
    return 4;
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const io: AgentSessionIo = {
    write: (value) => process.stdout.write(value),
    ask: (question) => readline.question(`${question}\n> `),
    confirm: async (question) =>
      /^(y|yes)$/i.test((await readline.question(`${question} [y/N] `)).trim()),
  };

  try {
    const prompt =
      arguments_.join(" ").trim() ||
      (await io.ask("What would you like AutoForge to build?"));
    const model = createOpenAIAgentModel({
      apiKey,
      ...(process.env.AUTOFORGE_OPENAI_MODEL
        ? { modelId: process.env.AUTOFORGE_OPENAI_MODEL }
        : {}),
    });
    const projectRoot = process.cwd();
    const result = await runAgentSession({
      runtime: new AiSdkAgentRuntime(model),
      gateway: new LocalSdkGateway(projectRoot),
      workspace: new LocalAgentWorkspace(projectRoot),
      io,
      prompt,
    });
    if (result.status !== "completed") {
      process.stdout.write(`\nAgent stopped: ${result.status}.\n`);
      return 0;
    }
    process.stdout.write(`\nHandoff: ${result.handoffLocation}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  } finally {
    readline.close();
  }
}
