"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		modules: ["node_modules", path.resolve(__dirname, "./node_modules")]
	}
};
