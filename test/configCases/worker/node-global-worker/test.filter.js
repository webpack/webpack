"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// the node Worker resolver uses `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno hard-panics (untrappable, bindings.rs "Module not found") when the jest vm
// harness spawns a real worker thread; the panic aborts the whole process, so skip
// the harness execution under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
