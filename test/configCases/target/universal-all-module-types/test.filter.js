"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// ESM output runs via `--experimental-vm-modules` (Node >= 12) and the universal
// worker resolves `worker_threads` via `process.getBuiltinModule` (Node >= 22.3).
// TODO Bun 1.4.0: its fake web `Worker` exits before any message is delivered.
module.exports = () =>
	supportsWorker() &&
	typeof process.getBuiltinModule === "function" &&
	!process.versions.bun;
