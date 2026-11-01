"use strict";
const leaf = require("./pure-leaf"),
	other = require("./pure-typescript-getter");
exports.read = () => leaf.a + other.a;
