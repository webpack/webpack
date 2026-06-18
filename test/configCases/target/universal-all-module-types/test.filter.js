"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// ESM output runs via `--experimental-vm-modules` (Node >= 12) and the
// universal worker resolves `worker_threads` via `process.getBuiltinModule`
// (Node >= 22.3).
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";
