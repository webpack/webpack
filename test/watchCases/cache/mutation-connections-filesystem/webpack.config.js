"use strict";

const configuration = require("../mutation-connections/webpack.config");

/** @returns {import("webpack").Configuration} watch configuration */
module.exports = () => ({
	...configuration(),
	mode: "production",
	cache: { type: "filesystem" }
});
