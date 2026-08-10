"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// The `node-commonjs` externals below build `require` from `node:module`, which
// only exists from Node 12.2.
module.exports = () => supportsRequireInModule();
