"use strict";

module.exports = require("./b?nullish");
let set = global.conditionalReexportFlag || 0;
set ??= module.exports = require("./a?nullish");
