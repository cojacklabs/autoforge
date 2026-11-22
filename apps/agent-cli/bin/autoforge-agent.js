#!/usr/bin/env node

/**
 * Deprecated alias for priozar-agent, kept through the compatibility window so
 * existing launchers and scripts keep working.
 */

import { main } from "../dist/cli.js";

// Only warn a person at a terminal; scripts, CI and pipes see no extra output.
if (process.stderr.isTTY) {
  process.stderr.write(
    'Note: "autoforge-agent" is deprecated; use "priozar-agent" instead.\n',
  );
}

process.exitCode = await main();
