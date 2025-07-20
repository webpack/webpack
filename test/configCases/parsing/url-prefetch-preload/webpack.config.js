/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		assetModuleFilename: "[name][ext]"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
