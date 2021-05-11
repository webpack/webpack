var webpack = require("../../../");
var fs = require("fs");
var join = require("path").join;

function read(path) {
	return JSON.stringify(
		fs.readFileSync(join(__dirname, path), "utf8").replace(/\r\n?/g, "\n")
	);
}

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		output: {
			filename: "123.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "123"
			})
		]
	},

	{
		mode: "production",
		entry: "./index",
		output: {
			filename: "321.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "321"
			})
		]
	},

	{
		mode: "production",
		entry: "./index",
		output: {
			filename: "both.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				VALUE: webpack.DefinePlugin.runtimeValue(
					() => read("123.txt"),
					[join(__dirname, "./123.txt")]
				)
			}),
			new webpack.DefinePlugin({
				VALUE: webpack.DefinePlugin.runtimeValue(
					() => read("321.txt"),
					[join(__dirname, "./321.txt")]
				)
			})
		]
	}
];
