"use strict";

const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-warnings",
	infrastructureLogging: {
		level: "warn"
	},
	plugins: [new LogTestPlugin()]
};
