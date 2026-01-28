"use strict";

module.exports = function (config) {
	try {
		eval("class A { static {} }");
		return true;
	} catch {
		return false;
	}
};
