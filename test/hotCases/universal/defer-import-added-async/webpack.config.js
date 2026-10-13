"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	...require("../../harmony/defer-import-added-async/webpack.config"),
	context: path.resolve(__dirname, "../../harmony/defer-import-added-async")
};
