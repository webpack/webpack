"use strict";

module.exports = require("./b?loop");
for (const flag of [global.conditionalReexportFlag]) {
	if (flag) module.exports = require("./a?loop");
}
while (global.conditionalReexportFlag) {
	module.exports = require("./a?while");
}
