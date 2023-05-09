var path = require("path");

module.exports = {
	entry: "./example.js",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		chunkFilename: "[name].js",
		publicPath: "/dist/",
		workerChunkLoading: "import",
		module: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	experiments: {
		outputModule: true
	}
};
