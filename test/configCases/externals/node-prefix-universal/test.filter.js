"use strict";

const supportsProcessGetBuiltinModule = require("../../../helpers/supportsProcessGetBuiltinModule");

// The universal external loads core modules through `process.getBuiltinModule`
// / `createRequire`, only available at runtime on node with that API.
module.exports = () => supportsProcessGetBuiltinModule();
