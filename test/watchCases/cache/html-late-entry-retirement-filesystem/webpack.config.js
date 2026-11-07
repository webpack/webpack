"use strict";

const configuration = require("../html-late-entry-retirement/webpack.config");

/** @returns {import("webpack").Configuration} watch configuration */
module.exports = () => ({
	...configuration(),
	cache: { type: "filesystem" },
	module: { unsafeCache: true }
});
