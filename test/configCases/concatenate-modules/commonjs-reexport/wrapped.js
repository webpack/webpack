"use strict";

(global.__ran || (global.__ran = [])).push("wrapped");

exports.count = 0;
exports.v = "wrapped";
exports.bump = function bump() {
	exports.count += 1;
	return exports.count;
};
