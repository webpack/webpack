"use strict";

module.exports = require("./b?or");
let disabled = !global.conditionalReexportFlag;
disabled ||= module.exports = require("./a?or");
