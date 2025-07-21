"use strict";

module.exports = function supportsTemplateStrings() {
	try {
		const f = eval("(function f() { return String.raw`a\\b`; })");
		return f() === "a\\b";
	} catch (_err) {
		return false;
	}
};
