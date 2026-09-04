"use strict";

module.exports.Sub = function Sub() {
	this.marker = "sub";
};

module.exports.load = function load(value) {
	return value + 1;
};
