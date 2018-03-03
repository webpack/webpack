var webpack = require("../../../../");
module.exports = [
	{
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashDigestLength: 2
			})
		]
	},
	{
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashDigest: "hex",
				hashDigestLength: 2
			})
		]
	},
	{
		plugins: [
			new webpack.HashedModuleIdsPlugin({
				hashFunction: "sha1",
				hashDigestLength: 3
			})
		]
	}
];
