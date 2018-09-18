const webpack = require("../../../../");
module.exports = [
	{
		output: {
			libraryTarget: "commonjs2"
		},
		externals: {
			external: ["webpack", "version"]
		},
		plugins: [
			new webpack.DefinePlugin({
				EXPECTED: JSON.stringify(webpack.version)
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
