"use strict";

// coffeescript 2.7.1 calls `Array.prototype.flat`, which Node.js 10 lacks.
module.exports = function supportsArrayFlat() {
	return typeof [].flat === "function";
};
