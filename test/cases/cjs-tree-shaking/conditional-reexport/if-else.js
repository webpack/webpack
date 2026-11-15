"use strict";

if (global.conditionalReexportFlag) module.exports = require("./a?if");
else module.exports = require("./b?if");
