"use strict";

// A strict CommonJS `require` is what makes the concatenation reach `m.js`
// through a lazy accessor instead of an eager binding.
exports.touch = function touch() {
	return typeof require("./m.js");
};
