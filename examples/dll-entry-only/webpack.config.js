var path = require("path");
var webpack = require("../../");

module.exports = {
	// mode: "development" || "production",
	entry: {
		dll: ["./example"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		library: "[name]_[fullhash]"
	},
	optimization: {
		concatenateModules: true // this is enabled by default in production mode
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[fullhash]",
			entryOnly: true
		})
	]
};
