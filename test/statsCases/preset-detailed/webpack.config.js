"use strict";

const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "detailed",
	infrastructureLogging: {
		level: "log"
	},
	plugins: [new LogTestPlugin()]
};
