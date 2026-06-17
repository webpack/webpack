"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// universal worker resolves `worker_threads` via `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";
