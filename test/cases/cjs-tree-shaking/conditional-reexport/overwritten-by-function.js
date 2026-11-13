"use strict";

function reset() {
	exports.name = "reset";
}
exports.name = require("./a?overwritten-by-function").name;
reset();
