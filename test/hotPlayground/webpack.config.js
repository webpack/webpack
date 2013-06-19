module.exports = {
	entry: ["../../hot/dev-server", "./index.js"],
	output: {
		filename: "bundle.js",
		hotUpdateChunkFilename: "[id].[hash].bundle-update.js",
		hashDigestLength: 4
	},
	hot: true, // enable hot module replacement
	recordsPath: __dirname + "/records.json" // this is not required for the webpack-dev-server, but when compiled.
};