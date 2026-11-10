"use strict";

exports.load = function load() {
	try {
		return require("./native-binding").impl;
	} catch (_err) {
		return "fallback";
	}
};
