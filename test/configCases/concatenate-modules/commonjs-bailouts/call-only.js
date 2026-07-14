"use strict";

exports.f = function () {
	return "f";
};
exports.g = function () {
	// direct call passes the exports object as `this`
	return `${exports.f()}-g`;
};
