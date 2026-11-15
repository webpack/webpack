"use strict";

global.conditionalReexportFlag
	? (module.exports = require("./a?ternary"))
	: (module.exports = require("./b?ternary"));
