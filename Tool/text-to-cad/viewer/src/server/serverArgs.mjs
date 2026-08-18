import { DEFAULT_PORT_SCAN_LIMIT } from "./serverListen.mjs";
import { parseServerLifetimeMs } from "./serverLifetime.mjs";

function requiredValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parsePort(value, flag) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`${flag} must be a TCP port from 1 to 65535`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, flag) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

export function parseServerArgs(argv = []) {
  const options = {
    port: null,
    host: "",
    rootDir: "",
    shutdownAfterMs: null,
    portScanLimit: DEFAULT_PORT_SCAN_LIMIT,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg.startsWith("--root-dir=")) {
      throw new Error("--root-dir has been removed; pass ?dir= in the Viewer URL.");
    }
    if (arg === "--root-dir") {
      throw new Error("--root-dir has been removed; pass ?dir= in the Viewer URL.");
    }
    if (arg.startsWith("--dir=")) {
      options.rootDir = arg.slice("--dir=".length).trim();
      continue;
    }
    if (arg === "--dir") {
      options.rootDir = requiredValue(argv, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = parsePort(arg.slice("--port=".length), "--port");
      continue;
    }
    if (arg === "--port") {
      options.port = parsePort(requiredValue(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length).trim();
      continue;
    }
    if (arg === "--host") {
      options.host = requiredValue(argv, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--shutdown-after=")) {
      options.shutdownAfterMs = parseServerLifetimeMs(arg.slice("--shutdown-after=".length), "--shutdown-after");
      continue;
    }
    if (arg === "--shutdown-after") {
      options.shutdownAfterMs = parseServerLifetimeMs(requiredValue(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--port-scan-limit=")) {
      options.portScanLimit = parseNonNegativeInteger(arg.slice("--port-scan-limit=".length), "--port-scan-limit");
      continue;
    }
    if (arg === "--port-scan-limit") {
      options.portScanLimit = parseNonNegativeInteger(requiredValue(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export function serverHelpText() {
  return `Usage: node backend/server.mjs [options]

Options:
  --port <number>    First port to try. Defaults to 4178.
  --host <host>      Host to bind. Defaults to 127.0.0.1.
  --dir <path>       Default local directory root. Defaults to startup directory.
  --shutdown-after <time>
                     Shut down after a duration such as 12h, 30m, or 60000.
  --port-scan-limit <number>
                     How many additional ports to try when the requested port
                     is in use. Defaults to ${DEFAULT_PORT_SCAN_LIMIT}. Pass 0 to fail instead.
  --json             Print a machine-readable startup line as the last stdout
                     line, for example {"url":...,"port":...,"action":"start"}.
  -h, --help         Show this help.
`;
}

export function applyServerArgsToEnv({
  argv = [],
  env = process.env,
  cwd = process.cwd(),
} = {}) {
  const args = parseServerArgs(argv);
  const nextEnv = { ...env };
  return { args, env: nextEnv };
}
