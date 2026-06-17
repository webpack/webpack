"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// uses a `global globalThis` external, so requires globalThis (node 12+)
module.exports = () => supportsGlobalThis();
