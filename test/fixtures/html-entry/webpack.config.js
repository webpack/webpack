const path = require("path");

/** @type {import("../../..").Configuration} */
module.exports = {
	mode: "production",
	experiments: {
		html: true,
		css: true
	},
	entry: {
		index: "./src/index.html"
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "js/[name].[contenthash:8].js",
		clean: true
	}
};
