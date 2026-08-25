# Local Provider Credentials

AutoForge Agent stores local bring-your-own-key credentials in the operating
system's credential facility. Credentials are Agent runtime state, never Core
project truth.

## Storage contract

| Platform | Credential facility                       |
| -------- | ----------------------------------------- |
| macOS    | Keychain                                  |
| Windows  | Credential Manager                        |
| Linux    | Secret Service-compatible desktop keyring |

The native keyring entry uses service
`com.cojacklabs.autoforge-agent` and account `provider.openai.api-key`.
No secret, encrypted secret blob, credential-store path, or raw provider
conversation is written under the project, `.autoforge/`, logs, fixtures, or
handoffs.

## Commands

```bash
autoforge-agent credentials set openai
autoforge-agent credentials status openai
autoforge-agent credentials delete openai
```

`set` requires an interactive terminal and reads through a hidden prompt.
Secrets are not accepted as command-line arguments because arguments may be
visible to other local processes. `status` emits only `configured` or
`not configured`. Store errors are sanitized and fail closed.

The current provider is OpenAI. Additional providers require an explicit
provider identifier and a distinct fixed keyring account; they must not add
credential handling to Core or the provider adapter package.

## Recovery

If the Agent reports that the credential store cannot be read, unlock the
desktop keyring and retry. On headless Linux, configure a Secret Service session
before using the local Agent. AutoForge intentionally provides no plaintext or
tracked-file fallback.
