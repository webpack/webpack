"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		// written with a trailing separator
		modules: [`${path.resolve(__dirname, "apps")}${path.sep}`, "node_modules"]
	}
};
