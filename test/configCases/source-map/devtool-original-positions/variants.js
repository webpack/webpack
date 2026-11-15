"use strict";

// `[mode, devtool]` per config index, shared with `test.config.js`.
/** @type {["development" | "production", string][]} */
module.exports = [
	["development", "source-map"],
	["development", "inline-source-map"],
	["development", "hidden-source-map"],
	["development", "nosources-source-map"],
	["development", "cheap-source-map"],
	["development", "cheap-module-source-map"],
	["development", "inline-cheap-module-source-map"],
	["production", "source-map"],
	["production", "inline-source-map"],
	["production", "hidden-source-map"],
	["production", "nosources-source-map"]
];
