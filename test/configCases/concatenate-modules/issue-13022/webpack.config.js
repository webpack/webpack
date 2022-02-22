const path = require("path");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: {
			index: path.resolve(__dirname, "./index.js")
		},
		output: {
			library: "[name]",
			libraryExport: "default"
		},
		optimization: {
			concatenateModules: true
		}
	},
	{
		entry: {
			index: path.resolve(__dirname, "./index.js")
		},
		output: {
			library: "[name]_doc",
			libraryExport: "default"
		},
		optimization: {
			concatenateModules: true
		}
	}
];
