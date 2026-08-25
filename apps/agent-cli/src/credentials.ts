export const AUTOFORGE_CREDENTIAL_SERVICE = "com.cojacklabs.autoforge-agent";

export type ProviderCredentialId = "openai";

const ACCOUNTS: Record<ProviderCredentialId, string> = {
  openai: "provider.openai.api-key",
};

export interface CredentialVault {
  get(provider: ProviderCredentialId): Promise<string | null>;
  set(provider: ProviderCredentialId, secret: string): Promise<void>;
  delete(provider: ProviderCredentialId): Promise<boolean>;
}

interface KeyringEntry {
  getPassword(): string | null;
  setPassword(secret: string): void;
  deletePassword(): boolean;
}

type EntryFactory = (service: string, account: string) => KeyringEntry;

export class NativeCredentialVault implements CredentialVault {
  private readonly createEntry: EntryFactory;

  constructor(createEntry: EntryFactory) {
    this.createEntry = createEntry;
  }

  static async create(): Promise<NativeCredentialVault> {
    try {
      const { Entry } = await import("@napi-rs/keyring");
      return new NativeCredentialVault(
        (service, account) => new Entry(service, account),
      );
    } catch {
      throw new Error(
        "The operating-system credential store is unavailable. Ensure the native keyring package and an unlocked desktop keyring are available.",
      );
    }
  }

  async get(provider: ProviderCredentialId): Promise<string | null> {
    try {
      const value = this.entry(provider).getPassword();
      return value?.trim() ? value : null;
    } catch {
      throw new Error(
        "The operating-system credential store could not be read. Unlock it and try again.",
      );
    }
  }

  async set(provider: ProviderCredentialId, secret: string): Promise<void> {
    if (!secret.trim()) throw new Error("Credential cannot be empty.");
    if (secret.length > 16_384) throw new Error("Credential is too large.");
    try {
      this.entry(provider).setPassword(secret);
    } catch {
      throw new Error(
        "The operating-system credential store rejected the credential.",
      );
    }
  }

  async delete(provider: ProviderCredentialId): Promise<boolean> {
    try {
      return this.entry(provider).deletePassword();
    } catch {
      throw new Error(
        "The operating-system credential store could not delete the credential.",
      );
    }
  }

  private entry(provider: ProviderCredentialId): KeyringEntry {
    return this.createEntry(AUTOFORGE_CREDENTIAL_SERVICE, ACCOUNTS[provider]);
  }
}

export interface CredentialCommandIo {
  write(message: string): void;
  readSecret(prompt: string): Promise<string>;
}

export async function runCredentialCommand(
  arguments_: string[],
  vault: CredentialVault,
  io: CredentialCommandIo,
): Promise<number> {
  const [action, provider, ...extras] = arguments_;
  if (provider !== "openai" || extras.length > 0) {
    io.write("Usage: autoforge-agent credentials <set|status|delete> openai\n");
    return 2;
  }
  if (action === "set") {
    const secret = await io.readSecret("OpenAI API key: ");
    await vault.set(provider, secret);
    io.write(
      "OpenAI credential stored in the operating-system credential store.\n",
    );
    return 0;
  }
  if (action === "status") {
    const configured = (await vault.get(provider)) !== null;
    io.write(
      `OpenAI credential: ${configured ? "configured" : "not configured"}\n`,
    );
    return configured ? 0 : 4;
  }
  if (action === "delete") {
    const deleted = await vault.delete(provider);
    io.write(`OpenAI credential: ${deleted ? "deleted" : "not configured"}\n`);
    return 0;
  }
  io.write("Usage: autoforge-agent credentials <set|status|delete> openai\n");
  return 2;
}
