"use strict";

const supportsProcessGetBuiltinModule = require("../../../helpers/supportsProcessGetBuiltinModule");

// node-commonjs externals load via process.getBuiltinModule (node 22.3+)
module.exports = () => supportsProcessGetBuiltinModule();
