"use strict";

const configuration = require("../mutation-recovery/webpack.config");

/** @returns {import("../../../..").Configuration} watch configuration */
module.exports = () => ({
	...configuration(),
	mode: "production",
	cache: { type: "filesystem" }
});
