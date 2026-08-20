"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// ESM output runs via `--experimental-vm-modules` (Node >= 12) and the
// universal worker resolves `worker_threads` via `process.getBuiltinModule`
// (Node >= 22.3).
// TODO Bun 1.4.0 regression: the harness's fake web `Worker` boots its eval
// worker and imports the emitted chunk, then exits with code 1 before any
// message is delivered, so the case times out. Bun 1.3.x and Node keep it alive.
module.exports = () =>
	supportsWorker() &&
	typeof process.getBuiltinModule === "function" &&
	!process.versions.bun;
