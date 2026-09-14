#!/usr/bin/env node

/**
 * Priozar CLI - The open-source engineering control plane.
 * Successor executable to autoforge.
 */

import { main } from "../dist/cli.js";

process.exitCode = await main();
