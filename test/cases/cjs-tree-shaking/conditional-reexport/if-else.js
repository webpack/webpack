"use strict";

if (globalThis.conditionalReexportFlag) module.exports = require("./a?if");
else module.exports = require("./b?if");
