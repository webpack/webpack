const webpack = require("../../../../");

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		output: {
			libraryTarget: "global"
		},
		externals: {
			external: ["process", "version"]
		},
		plugins: [
			new webpack.DefinePlugin({
				EXPECTED: JSON.stringify(process.version)
			})
		]
	},
	{
		externals: {
			external: ["Array", "isArray"]
		},
		plugins: [
			new webpack.DefinePlugin({
				EXPECTED: "Array.isArray"
			})
		]
	}
];
