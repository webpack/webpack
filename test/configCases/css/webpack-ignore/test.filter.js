"use strict";

// TODO Bun resolves less-loader's dynamic `import('less')` to undefined in the
// jest vm, so the build errors differ from Node; skip these less cases under Bun.
module.exports = () => !process.versions.bun;
