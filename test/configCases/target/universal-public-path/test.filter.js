"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// universal target assumes globalThis and modern ESM output (node 12+)
module.exports = () => supportsGlobalThis();
