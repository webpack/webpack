const path = require("path");
const webpack = require("../../");

module.exports = {
	// mode: "development" || "production",
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/dist/alpha-manifest.json")
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/dist/beta-manifest.json"),
			extensions: [".js", ".jsx"]
		})
	]
};
