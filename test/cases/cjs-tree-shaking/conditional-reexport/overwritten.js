"use strict";

exports.value = require("./a?overwritten");
if (!global.conditionalReexportFlag) exports.value = require("./b?overwritten");
