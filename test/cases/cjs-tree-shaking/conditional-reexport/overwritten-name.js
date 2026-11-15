"use strict";

exports.name = require("./a?overwritten-name").name;
if (!global.conditionalReexportFlag) {
	exports.name = require("./b?overwritten-name").name;
}
