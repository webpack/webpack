"use strict";

module.exports = require("./b?member");
const holder = { value: !global.conditionalReexportFlag };
holder.value ||= module.exports = require("./a?member");
