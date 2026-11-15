"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	...require("../../esm-output/newer-build-sibling-chunk/webpack.config"),
	context: path.resolve(__dirname, "../../esm-output/newer-build-sibling-chunk")
};
