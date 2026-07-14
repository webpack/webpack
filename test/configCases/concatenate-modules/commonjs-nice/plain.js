"use strict";

exports.a = 1;
module.exports.b = 2;
var counter = 0;
exports.inc = function () {
	counter++;
	return counter;
};
