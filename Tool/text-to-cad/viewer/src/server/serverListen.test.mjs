import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_PORT_SCAN_LIMIT,
  buildViewerStartupJson,
  buildViewerStartupUrl,
  listenWithPortFallback,
} from "./serverListen.mjs";

const host = "127.0.0.1";

function createServer() {
  return http.createServer((req, res) => {
    res.statusCode = 204;
    res.end();
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

async function occupyPort() {
  const server = createServer();
  const port = await new Promise((resolve) => {
    server.listen(0, host, () => resolve(server.address().port));
  });
  return { server, port };
}

test("listenWithPortFallback binds the requested port when it is free", async (t) => {
  const blocker = createServer();
  const blockerPort = (await new Promise((resolve) => {
    blocker.listen(0, host, () => resolve(blocker.address().port));
  }));
  await closeServer(blocker);

  const server = createServer();
  t.after(() => closeServer(server));
  const bound = await listenWithPortFallback({ server, host, port: blockerPort });
  assert.equal(bound, blockerPort);
  assert.equal(server.address().port, blockerPort);
});

test("listenWithPortFallback scans forward when the requested port is in use", async (t) => {
  const occupied = await occupyPort();
  t.after(() => closeServer(occupied.server));

  const server = createServer();
  t.after(() => closeServer(server));
  const bound = await listenWithPortFallback({
    server,
    host,
    port: occupied.port,
    scanLimit: 8,
  });

  assert.ok(bound > occupied.port, `expected a port above ${occupied.port}, got ${bound}`);
  assert.ok(bound <= occupied.port + 8, `expected a port within the scan window, got ${bound}`);
  assert.equal(server.address().port, bound);
});

test("listenWithPortFallback fails with a clear message when scanning is disabled", async (t) => {
  const occupied = await occupyPort();
  t.after(() => closeServer(occupied.server));

  const server = createServer();
  t.after(() => closeServer(server));
  await assert.rejects(
    listenWithPortFallback({ server, host, port: occupied.port, scanLimit: 0 }),
    /already in use.*--port/su,
  );
});

test("listenWithPortFallback reports the exhausted range", async (t) => {
  const occupied = await occupyPort();
  t.after(() => closeServer(occupied.server));

  const neighbour = createServer();
  t.after(() => closeServer(neighbour));
  let neighbourBound = false;
  try {
    await listenWithPortFallback({ server: neighbour, host, port: occupied.port + 1, scanLimit: 0 });
    neighbourBound = true;
  } catch {
    // The neighbouring port is already taken by something else, which is fine.
  }
  if (!neighbourBound) {
    return;
  }

  const server = createServer();
  t.after(() => closeServer(server));
  await assert.rejects(
    listenWithPortFallback({ server, host, port: occupied.port, scanLimit: 1 }),
    new RegExp(`ports ${occupied.port}-${occupied.port + 1} are all in use`, "u"),
  );
});

test("listenWithPortFallback rejects an invalid port", () => {
  assert.throws(
    () => listenWithPortFallback({ server: createServer(), host, port: 99999 }),
    /TCP port from 1 to 65535/u,
  );
});

test("buildViewerStartupUrl omits ?dir= when no directory was requested", () => {
  assert.equal(
    buildViewerStartupUrl({ host, port: 4178 }),
    "http://127.0.0.1:4178/",
  );
});

test("buildViewerStartupUrl resolves relative directories against the startup directory", () => {
  assert.equal(
    buildViewerStartupUrl({ host, port: 4178, rootDir: "/absolute/models" }),
    `http://127.0.0.1:4178/?dir=${encodeURIComponent("/absolute/models")}`,
  );
  assert.equal(
    buildViewerStartupUrl({ host, port: 4178, rootDir: "models", cwd: "/repo" }),
    `http://127.0.0.1:4178/?dir=${encodeURIComponent(path.resolve("/repo", "models"))}`,
  );
});

test("buildViewerStartupJson matches the documented handshake shape", () => {
  assert.deepEqual(
    buildViewerStartupJson({ host, port: 4180, rootDir: "/absolute/models" }),
    {
      url: `http://127.0.0.1:4180/?dir=${encodeURIComponent("/absolute/models")}`,
      host: "127.0.0.1",
      port: 4180,
      action: "start",
    },
  );
});

test("the default port scan limit leaves room for parallel viewers", () => {
  assert.ok(DEFAULT_PORT_SCAN_LIMIT >= 8);
});
