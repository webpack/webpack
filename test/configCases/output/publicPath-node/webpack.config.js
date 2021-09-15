/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "node",
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
