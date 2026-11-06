"use strict";

const supportsProcessGetBuiltinModule = require("../../../helpers/supportsProcessGetBuiltinModule");
const supportsResponse = require("../../../helpers/supportsResponse");

// The node backends read the binary through `process.getBuiltinModule` (Node >= 22.3).
module.exports = () => supportsProcessGetBuiltinModule() && supportsResponse();
