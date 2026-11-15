"use strict";

false
	? (module.exports = require("./a?constant-ternary"))
	: (module.exports = require("./b?constant-ternary"));
