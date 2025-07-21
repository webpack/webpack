"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");
const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

module.exports = () => supportsWebAssembly() && supportsResponse();
