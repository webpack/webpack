"use strict";

exports.pick = function pick(flag) {
	if (flag) {
		return require("./sloppy-target").v;
	}
	return "none";
};

exports.callLater = function callLater() {
	return require("./sloppy-target").v;
};
