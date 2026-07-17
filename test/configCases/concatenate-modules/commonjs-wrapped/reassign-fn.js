"use strict";

// a bare function export, the most common "weird" CommonJS shape
module.exports = function double(x) {
	return x * 2;
};
module.exports.tag = "fn";
