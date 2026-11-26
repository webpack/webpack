"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	...require("../../esm-output/newer-build-sibling-chunk/webpack.config"),
	context: path.resolve(__dirname, "../../esm-output/newer-build-sibling-chunk")
};
