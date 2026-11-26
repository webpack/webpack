"use strict";

const configuration = require("../mutation-recovery/webpack.config");

/** @import { Configuration } from "webpack" */

/** @returns {Configuration} watch configuration */
module.exports = () => ({
	...configuration(),
	mode: "production",
	cache: { type: "filesystem" }
});
