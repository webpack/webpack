"use strict";

exports.fn = function fn() {
	return this === undefined ? "detached" : "bound";
};
exports.value = "value";
