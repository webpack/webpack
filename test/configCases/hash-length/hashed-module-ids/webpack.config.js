var webpack = require("../../../../");
module.exports = [
	{
		optimization: {
			moduleIds: false
		},
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashDigestLength: 2
			})
		]
	},
	{
		optimization: {
			moduleIds: false
		},
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashDigest: "hex",
				hashDigestLength: 2
			})
		]
	},
	{
		optimization: {
			moduleIds: false
		},
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashFunction: "sha1",
				hashDigestLength: 3
			})
		]
	}
];
