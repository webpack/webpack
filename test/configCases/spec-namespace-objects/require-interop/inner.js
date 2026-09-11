"use strict";

// A strict CommonJS `require` is both what this case is about and what makes
// the concatenation reach `m.js` through a lazy accessor.
exports.required = function required() {
	return require("./m.js");
};
