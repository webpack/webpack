"use strict";

module.exports = require("./b?logical");
globalThis.conditionalReexportFlag && (module.exports = require("./a?logical"));
