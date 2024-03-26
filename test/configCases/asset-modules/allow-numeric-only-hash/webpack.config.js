/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		hashDigestLength: 6
	},
	module: {
		rules: [
			{
				test: /file.png$/,
				type: "asset/resource",
				generator: {
					emit: false,
					filename: "[name].[contenthash:6][ext]",
					allowNumericOnlyHash: false
				}
			},
			{
				test: /file_copy.png$/,
				type: "asset/resource",
				generator: {
					emit: false,
					filename: "[name].[contenthash:6][ext]",
					allowNumericOnlyHash: true
				}
			}
		]
	}
};
