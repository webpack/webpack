/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "asset/resource",
				dependency: "url"
			}
		]
	},
	experiments: {
		asset: true
	}
};
