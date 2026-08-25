# AutoForge Providers

`@cojacklabs/autoforge-providers` contains model-provider adapters for
AutoForge Agent applications. It never reads or writes Core project state,
credentials, decisions, work, or handoffs.

The initial private `0.1.0` workspace package exposes one OpenAI model factory
and defaults to `gpt-5.6-sol`. Callers inject the API key at runtime; this
package does not load, persist, or log credentials. Its provider interface is
experimental and is not authorized for publication.
