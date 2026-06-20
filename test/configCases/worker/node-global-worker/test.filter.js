"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// the node Worker resolver uses `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno hard-panics (untrappable, bindings.rs "Module not found") when the jest vm
// harness spawns a real worker thread; the panic aborts the whole process, so skip
// the harness execution under Deno.
// TODO Bun hangs here (same root cause as worker/node-worker-esm): a message
// queued while webpack's import() worker chunk loading is in flight stalls Bun's
// event loop, so the worker never attaches its listener; Node buffers it.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
