"use strict";

module.exports = function supportsProcessGetBuiltinModule() {
	return (
		typeof process !== "undefined" &&
		typeof process.getBuiltinModule === "function"
	);
};
