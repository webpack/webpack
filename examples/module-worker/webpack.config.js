var path = require("path");

module.exports = {
	entry: "./example.js",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		chunkFilename: "[name].js",
		publicPath: "/dist/"
	},
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	target: "browserslist: last 2 Chrome versions",
	experiments: {
		outputModule: true
	}
};
