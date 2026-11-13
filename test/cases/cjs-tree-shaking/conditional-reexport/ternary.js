"use strict";

globalThis.conditionalReexportFlag
	? (module.exports = require("./a?ternary"))
	: (module.exports = require("./b?ternary"));
