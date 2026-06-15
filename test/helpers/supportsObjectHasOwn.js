"use strict";

module.exports = function supportsObjectHasOwn() {
	return typeof Object.hasOwn === "function";
};
