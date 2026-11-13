"use strict";

module.exports = require("./b?logical");
global.conditionalReexportFlag && (module.exports = require("./a?logical"));
