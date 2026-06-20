"use strict";

// TODO Bun (JSC) formats the invalid magic-comment parse errors differently
// than V8, so the printed stats snapshot doesn't match.
module.exports = () => !process.versions.bun;
