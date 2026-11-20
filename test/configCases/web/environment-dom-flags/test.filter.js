"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// a chrome 120 runtime reads the chunk loading global off globalThis (node 12+)
module.exports = () => supportsGlobalThis();
