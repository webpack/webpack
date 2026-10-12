"use strict";

const configuration = require("../mutation-invalidation/webpack.config");

/** @returns {import("../../../..").Configuration} watch configuration */
module.exports = () => ({
	...configuration(),
	mode: "production",
	cache: { type: "filesystem" }
});
