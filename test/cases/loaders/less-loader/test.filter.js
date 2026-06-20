"use strict";

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun loads the `less` implementation differently, so the build error text
// differs from the Node snapshot; skip on Bun too.
module.exports = () => !process.versions.deno && !process.versions.bun;
