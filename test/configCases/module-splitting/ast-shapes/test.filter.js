"use strict";

const supportsClassFields = require("../../../helpers/supportsClassFields");

// The fixture emits a class field, so gate it to runtimes that support them.
module.exports = () => supportsClassFields();
