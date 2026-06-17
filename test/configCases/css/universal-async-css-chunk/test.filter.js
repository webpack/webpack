"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// the SSR style registry is exposed on globalThis (node 12+)
module.exports = () => supportsGlobalThis();
