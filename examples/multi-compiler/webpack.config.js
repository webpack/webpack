var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: "mobile.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("mobile")
			})
		]
	},
	{
		entry: "./example",
		output: {
			path: path.join(__dirname, "js"),
			filename: "desktop.js"
		},
		plugins: [
			new webpack.DefinePlugin({
				ENV: JSON.stringify("desktop")
			})
		]
	}
];