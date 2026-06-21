"use strict";

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun hard-crashes (SIGSEGV) loading the `less` package in jest's vm: a
// vm-loaded ESM module that statically imports a node builtin crashes Bun, and
// less is ESM importing `module`/`fs`/…; the crash aborts the whole run.
module.exports = () => !process.versions.deno && !process.versions.bun;
