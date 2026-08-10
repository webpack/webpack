"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// The `node-commonjs` externals build `require` from `node:module` (Node 12.2+).
module.exports = () => supportsRequireInModule();
