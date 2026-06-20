"use strict";

// TODO Bun (JSC) formats the DllReferencePlugin manifest parse error
// differently than V8, so the printed stats snapshot doesn't match.
module.exports = () => !process.versions.bun;
