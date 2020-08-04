/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	output: {
		assetModuleFilename: "[name][ext]",
		publicPath: "/path2/"
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
