"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// This variant emits a bare `globalThis` reference (no polyfill), so it only
// runs where the runtime has globalThis (node 12+).
module.exports = () => supportsGlobalThis();
