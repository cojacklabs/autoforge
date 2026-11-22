#!/usr/bin/env node

/**
 * Deprecated alias for the priozar command, kept through the compatibility
 * window so existing scripts, hooks and CI keep working.
 */

import { main } from "../dist/cli.js";

// Only warn a person at a terminal; scripts, CI and pipes see no extra output.
if (process.stderr.isTTY) {
  process.stderr.write(
    'Note: the "autoforge" command is deprecated; use "priozar" instead.\n',
  );
}

process.exitCode = await main();
