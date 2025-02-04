/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		realContentHash: true
	},
	module: {
		generator: {
			asset: {
				filename: "assets/[name].[contenthash][ext]"
			}
		},
		rules: [
			{
				test: /file\.text$/,
				type: "asset/resource"
			}
		]
	}
};
