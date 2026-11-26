"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	...require("../../harmony/defer-import-added-async/webpack.config"),
	context: path.resolve(__dirname, "../../harmony/defer-import-added-async")
};
