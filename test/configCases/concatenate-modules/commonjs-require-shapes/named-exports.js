"use strict";

exports.first = "first";
exports.second = "second";
exports.readThis = function readThis() {
	return this === module.exports ? "this=exports" : "this=other";
};
