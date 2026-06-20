"use strict";

// TODO engine-inherent: webpack captures logger trace stacks assuming V8's
// `Error.stack` shape (slice(3) + LOADER_EXECUTION cut); JSC (Bun) differs in
// header line, frame names, and line:col, so the printed trace can't be matched.
module.exports = () => !process.versions.bun;
