"use strict";

const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: false,
	plugins: [new LogTestPlugin()]
};
