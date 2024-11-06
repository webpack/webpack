/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	output: {
		filename: "bundle.[name].[contenthash].js",
		cssFilename: "bundle.[name].[contenthash].css",
		chunkFilename: "async.[name].[contenthash].js",
		cssChunkFilename: "async.[name].[contenthash].css"
	},
	experiments: {
		css: true
	}
};
