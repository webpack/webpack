var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: {
		// The entry points for the pages
		// They also contains router
		pageA: ["./aEntry", "./router"],
		pageB: ["./bEntry", "./router"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		publicPath: "js/",
		filename: "[name].bundle.js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		// Extract common modules from initial chunks too
		// This is optional, but good for performance.
		splitChunks: {
			chunks: "all",
			minSize: 0 // This example is too small
		},
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};
