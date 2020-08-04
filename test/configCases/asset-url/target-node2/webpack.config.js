/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "asset/resource"
			}
		]
	},
	experiments: {
		asset: true
	}
};
