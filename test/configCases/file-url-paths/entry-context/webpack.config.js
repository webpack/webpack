"use strict";

const { pathToFileURL } = require("url");
const webpack = require("../../../../");

// EntryPlugin (via Compilation.addEntry) accepts a file URL context
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {},
	plugins: [
		new webpack.EntryPlugin(pathToFileURL(__dirname), "./index.js", {
			name: "main"
		})
	]
};
