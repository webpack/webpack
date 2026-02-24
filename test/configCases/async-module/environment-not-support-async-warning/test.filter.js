"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");
const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

module.exports = () => supportsWebAssembly() && supportsGlobalThis();
