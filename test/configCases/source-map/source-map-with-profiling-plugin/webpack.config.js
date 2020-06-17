var webpack = require("../../../../");
var path = require("path");
var os = require("os");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: ["./index.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.debug.ProfilingPlugin({
			outputPath: path.join(os.tmpdir(), "events.json")
		})
	],
	devtool: "source-map"
};
