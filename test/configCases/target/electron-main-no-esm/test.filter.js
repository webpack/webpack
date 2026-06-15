"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// `output.module` here emits `import { createRequire } from "module"`,
// which older Node versions can't link in the vm ESM runner
module.exports = () => supportsRequireInModule();
