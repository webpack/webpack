"use strict";

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun resolves less-loader's dynamic `import('less')` to undefined in the
// jest vm, so the build errors differ from Node; skip these less cases under Bun.
module.exports = () => !process.versions.deno && !process.versions.bun;
