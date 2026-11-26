"use strict";

const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	profile: true,
	stats: "verbose",
	infrastructureLogging: {
		level: "verbose"
	},
	plugins: [new LogTestPlugin()]
};
