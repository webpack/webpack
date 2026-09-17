"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// The universal worker resolves `worker_threads` via `process.getBuiltinModule`
// (Node >= 22.3). TODO Bun 1.4.0: its fake web `Worker` exits before any message
// is delivered, so the case times out.
module.exports = () =>
	supportsWorker() &&
	typeof process.getBuiltinModule === "function" &&
	!process.versions.bun;
