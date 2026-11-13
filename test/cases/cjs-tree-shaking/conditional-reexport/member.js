"use strict";

if (globalThis.conditionalReexportFlag) exports.value = require("./a?member");
else exports.value = require("./b?member");
