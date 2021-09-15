/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		name: "normal-ids",
		output: {
			filename: "bundle0.[contenthash:6].js",
			chunkFilename: "chunk0.[contenthash:6].js"
		},
		optimization: {
			chunkIds: "size",
			moduleIds: "named"
		}
	},
	{
		mode: "production",
		name: "normal-ids",
		output: {
			filename: "bundle1.[contenthash:6].js",
			chunkFilename: "chunk1.[contenthash:6].js"
		},
		optimization: {
			chunkIds: "named",
			moduleIds: "named"
		}
	}
];
