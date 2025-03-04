/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	output: {
		filename: "bundle.js",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "asset/resource",
				use: [
					{
						loader: "css-loader"
					},
					{
						loader: require.resolve("./loader")
					}
				]
			}
		]
	},
	// Storing the compilation stats to access from tests
	stats: {
		all: true,
		errorDetails: true
	}
};
