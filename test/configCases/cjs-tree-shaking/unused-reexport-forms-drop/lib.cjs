"use strict";

exports.ns = {};
exports.ns.x = require("./sef.cjs");
Object.defineProperty(exports, "viaValue", {
	enumerable: true,
	value: require("./sef.cjs")
});
exports.viaIds = require("./sef.cjs").y;
exports.used = "used";
