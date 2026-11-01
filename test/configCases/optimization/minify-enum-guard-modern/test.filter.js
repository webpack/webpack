"use strict";

const supportsClassFields = require("../../../helpers/supportsClassFields");
const supportsNullishCoalescing = require("../../../helpers/supportsNullishCoalescing");

module.exports = () => supportsClassFields() && supportsNullishCoalescing();
