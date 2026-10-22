"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: path.resolve(__dirname, "../../harmony/defer-import-added-async"),
	experiments: { deferImport: true },
	optimization: { concatenateModules: false },
	output: { module: true, chunkFormat: "module" }
};
