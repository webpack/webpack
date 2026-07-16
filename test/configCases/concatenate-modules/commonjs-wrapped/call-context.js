"use strict";

exports.helper = function () {
	return this === module.exports ? "ctx-ok" : "ctx-broken";
};
exports.run = function run() {
	// exports.helper() passes the exports object as `this`
	return exports.helper();
};
