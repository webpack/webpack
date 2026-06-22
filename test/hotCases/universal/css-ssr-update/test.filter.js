"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// node SSR style collection uses globalThis (node 12+); universal target assumes it
module.exports = () => supportsGlobalThis();
