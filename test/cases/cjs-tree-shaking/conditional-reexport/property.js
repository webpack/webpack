"use strict";

if (global.conditionalReexportFlag) {
	exports.name = require("./a?property").name;
	Object.defineProperty(exports, "other", { value: require("./a?define") });
} else {
	exports.name = require("./b?property").name;
	Object.defineProperty(exports, "other", { value: require("./b?define") });
}
