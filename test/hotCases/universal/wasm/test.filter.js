"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");
const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

// async wasm output is an async module (top-level await) and the web path
// needs `Response`; both require a modern Node.js
module.exports = () => supportsWebAssembly() && supportsResponse();
