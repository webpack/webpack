"use strict";

module.exports = require("./b?and");
let enabled = Boolean(global.conditionalReexportFlag);
enabled &&= module.exports = require("./a?and");
