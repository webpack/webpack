/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "web",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.jpg$/,
				type: "asset/resource"
			}
		]
	}
};
