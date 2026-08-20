"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");
const supportsWasmStreaming = require("../../../helpers/supportsWasmStreaming");

// The fallback this case is about is only reachable where streaming exists
module.exports = () => supportsResponse() && supportsWasmStreaming();
