"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	...require("../../harmony/defer-import-added/webpack.config"),
	context: path.resolve(__dirname, "../../harmony/defer-import-added"),
	output: { module: true, chunkFormat: "module" }
};
