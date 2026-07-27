"use strict";

// `require.main` compiles to a module cache lookup, so it bails out like
// `require.cache` — no moduleConcatenationBailout flag is set for it
exports.hasMain = require.main !== undefined;
