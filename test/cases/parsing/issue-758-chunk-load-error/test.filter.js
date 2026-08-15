"use strict";

// Patching `__webpack_chunk_load__` only intercepts the runtime form. ESM output
// bakes the chunk import into the module, which never reads that global.
module.exports = (config) => !config.module;
