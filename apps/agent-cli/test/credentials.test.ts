import { describe, expect, it, vi } from "vitest";

import {
  AUTOFORGE_CREDENTIAL_SERVICE,
  NativeCredentialVault,
  runCredentialCommand,
  type CredentialCommandIo,
  type CredentialVault,
} from "../src/credentials.js";

describe("NativeCredentialVault", () => {
  it("uses a fixed OS-keyring namespace and never transforms the secret", async () => {
    let stored: string | null = null;
    const createEntry = vi.fn(() => ({
      getPassword: () => stored,
      setPassword: (secret: string) => (stored = secret),
      deletePassword: () => {
        const existed = stored !== null;
        stored = null;
        return existed;
      },
    }));
    const vault = new NativeCredentialVault(createEntry);

    await vault.set("openai", "test-secret-value");
    expect(await vault.get("openai")).toBe("test-secret-value");
    expect(createEntry).toHaveBeenCalledWith(
      AUTOFORGE_CREDENTIAL_SERVICE,
      "provider.openai.api-key",
    );
    expect(await vault.delete("openai")).toBe(true);
    expect(await vault.get("openai")).toBeNull();
  });

  it("sanitizes native errors without leaking their message", async () => {
    const vault = new NativeCredentialVault(() => ({
      getPassword: () => {
        throw new Error("native failure containing sensitive-value");
      },
      setPassword: () => {
        throw new Error("native failure containing sensitive-value");
      },
      deletePassword: () => false,
    }));
    await expect(vault.get("openai")).rejects.not.toThrow("sensitive-value");
    await expect(vault.set("openai", "sensitive-value")).rejects.not.toThrow(
      "sensitive-value",
    );
  });
});

describe("credential commands", () => {
  it("stores a hidden input and reports only metadata", async () => {
    let stored: string | null = null;
    const vault: CredentialVault = {
      get: async () => stored,
      set: async (_provider, secret) => {
        stored = secret;
      },
      delete: async () => {
        stored = null;
        return true;
      },
    };
    const output: string[] = [];
    const io: CredentialCommandIo = {
      write: (message) => output.push(message),
      readSecret: async () => "hidden-test-value",
    };

    expect(await runCredentialCommand(["set", "openai"], vault, io)).toBe(0);
    expect(await runCredentialCommand(["status", "openai"], vault, io)).toBe(0);
    expect(output.join("")).not.toContain("hidden-test-value");
    expect(output.join("")).toContain("configured");
  });

  it("rejects unknown providers without reading input", async () => {
    const readSecret = vi.fn(async () => "unused");
    const vault: CredentialVault = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    const exitCode = await runCredentialCommand(["set", "unknown"], vault, {
      write: vi.fn(),
      readSecret,
    });
    expect(exitCode).toBe(2);
    expect(readSecret).not.toHaveBeenCalled();
    expect(vault.set).not.toHaveBeenCalled();
  });
});
