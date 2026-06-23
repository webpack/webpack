"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// ESM output; runs under any modern runtime (Node with the esm runner, Bun).
module.exports = () => supportsGlobalThis();
