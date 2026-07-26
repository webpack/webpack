"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");

// Deno rejects the lazy-compiled wasm bytes ("WebAssembly.compile: not a buffer
// source"), so skip there; runs on Node and Bun.
module.exports = () => supportsResponse() && !process.versions.deno;
