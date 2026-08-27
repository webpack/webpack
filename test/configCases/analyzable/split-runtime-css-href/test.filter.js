"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// Reading the bundle back needs `require` in ESM output, which emits
// `import { createRequire } from "module"` — older Node can't link that.
module.exports = () => supportsRequireInModule();
