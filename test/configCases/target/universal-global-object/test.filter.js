"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// the emitted bundles reference the `globalThis` global (node 12+)
module.exports = () => supportsGlobalThis();
