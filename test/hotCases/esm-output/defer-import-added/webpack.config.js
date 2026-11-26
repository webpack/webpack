"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	context: path.resolve(__dirname, "../../harmony/defer-import-added"),
	experiments: { deferImport: true },
	optimization: { concatenateModules: false },
	output: { module: true, chunkFormat: "module" }
};
