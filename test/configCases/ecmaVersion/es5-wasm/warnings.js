"use strict";

// An async wasm module cannot be lowered to an es5 target: no `async`/`await`
// and no generator to fall back to, so webpack says so rather than pretending.
module.exports = [[/does not appear to support 'async\/await'/]];
