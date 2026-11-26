"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolve: {
		modules: [path.resolve(__dirname, "a"), path.resolve(__dirname, "b")],
		alias: {
			[path.resolve(__dirname, "a", "foo")]: false
		}
	}
};
