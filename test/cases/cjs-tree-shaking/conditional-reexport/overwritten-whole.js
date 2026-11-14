"use strict";

module.exports = require("./a?overwritten-whole");
if (!global.conditionalReexportFlag) {
	module.exports = require("./b?overwritten-whole");
}
