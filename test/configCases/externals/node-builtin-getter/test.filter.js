"use strict";

const supportsProcessGetBuiltinModule = require("../../../helpers/supportsProcessGetBuiltinModule");

// The known-getter build calls `process.getBuiltinModule` (Node >= 22.3).
module.exports = () => supportsProcessGetBuiltinModule();
