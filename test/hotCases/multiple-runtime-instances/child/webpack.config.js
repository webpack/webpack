const path = require("path");

/** @type import('webpack').Configuration */
module.exports = {
	mode: "development",
	entry: "./index.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js"
	},
	devServer: {
		port: 8000,
		headers: {
			"Access-Control-Allow-Origin": "*"
		}
	}
};
