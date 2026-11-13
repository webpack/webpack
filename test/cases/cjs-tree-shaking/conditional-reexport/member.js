"use strict";

if (global.conditionalReexportFlag) exports.value = require("./a?member");
else exports.value = require("./b?member");
