"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		alias: {
			app: [path.join(__dirname, "src/main"), path.join(__dirname, "src/foo")]
		}
	}
};
