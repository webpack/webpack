module.exports = {
	entry: {
		index: "./index"
	},
	output: {
		publicPath: "./notFound/",
		chunkFilename: "[name].js"
	},
	optimization: {
		reloadChunks: {
			alternatePublicPath: "./"
		}
	},
	target: "web"
};
