import path from "node:path";

export const DEFAULT_PORT_SCAN_LIMIT = 64;
const MAX_TCP_PORT = 65535;

function permissionErrorMessage(host, port, code) {
  return `CAD Viewer could not bind ${host}:${port} (${code}). `
    + "Rerun with permission to bind local ports, or pass --host/--port values the sandbox allows.";
}

function exhaustedErrorMessage(host, firstPort, lastPort) {
  if (firstPort === lastPort) {
    return `CAD Viewer could not bind ${host}:${firstPort} because the port is already in use. `
      + "Pass --port <number> to choose another port, or raise --port-scan-limit.";
  }
  return `CAD Viewer could not bind ${host}: ports ${firstPort}-${lastPort} are all in use. `
    + "Pass --port <number> to choose another port, or raise --port-scan-limit.";
}

/**
 * Bind `server`, scanning forward from `port` while the candidate is taken.
 *
 * The bundled runtime is started directly rather than through a launcher, so
 * port selection has to live here: an unhandled EADDRINUSE would otherwise
 * surface as a crash. Resolves with the port that was actually bound.
 */
export function listenWithPortFallback({
  server,
  host = "127.0.0.1",
  port,
  scanLimit = DEFAULT_PORT_SCAN_LIMIT,
} = {}) {
  if (!server || typeof server.listen !== "function") {
    throw new Error("listenWithPortFallback requires an http server");
  }
  const firstPort = Number(port);
  if (!Number.isInteger(firstPort) || firstPort <= 0 || firstPort > MAX_TCP_PORT) {
    throw new Error("listenWithPortFallback requires a TCP port from 1 to 65535");
  }
  const requestedScanLimit = Number(scanLimit);
  const attemptLimit = Number.isInteger(requestedScanLimit) && requestedScanLimit >= 0
    ? requestedScanLimit
    : DEFAULT_PORT_SCAN_LIMIT;

  return new Promise((resolve, reject) => {
    let candidate = firstPort;
    let attemptsUsed = 0;

    const cleanup = () => {
      server.removeListener("error", onError);
      server.removeListener("listening", onListening);
    };

    const onError = (error) => {
      const code = String(error?.code || "");
      if (code === "EADDRINUSE" && attemptsUsed < attemptLimit && candidate < MAX_TCP_PORT) {
        attemptsUsed += 1;
        candidate += 1;
        server.listen(candidate, host);
        return;
      }
      cleanup();
      if (code === "EACCES" || code === "EPERM") {
        reject(new Error(permissionErrorMessage(host, candidate, code), { cause: error }));
        return;
      }
      if (code === "EADDRINUSE") {
        reject(new Error(exhaustedErrorMessage(host, firstPort, candidate), { cause: error }));
        return;
      }
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const onListening = () => {
      cleanup();
      resolve(candidate);
    };

    server.on("error", onError);
    server.on("listening", onListening);
    server.listen(candidate, host);
  });
}

export function buildViewerStartupUrl({ host = "127.0.0.1", port, rootDir = "", cwd = "" } = {}) {
  const baseUrl = `http://${host}:${port}/`;
  const requestedDir = String(rootDir || "").trim();
  if (!requestedDir) {
    return baseUrl;
  }
  const absoluteDir = path.isAbsolute(requestedDir)
    ? path.resolve(requestedDir)
    : path.resolve(String(cwd || ""), requestedDir);
  return `${baseUrl}?dir=${encodeURIComponent(absoluteDir)}`;
}

/**
 * Machine-readable startup line for agents and the Claude Preview tool.
 * Callers print this as the last stdout line so it can be parsed by taking the
 * last line that begins with `{`.
 */
export function buildViewerStartupJson({ host = "127.0.0.1", port, rootDir = "", cwd = "" } = {}) {
  return {
    url: buildViewerStartupUrl({ host, port, rootDir, cwd }),
    host,
    port: Number(port),
    action: "start",
  };
}
