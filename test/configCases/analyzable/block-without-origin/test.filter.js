"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// `require.ensure` in ESM output emits `import { createRequire } from "module"`,
// which older Node versions can't link in the vm ESM runner.
module.exports = () => supportsRequireInModule();
