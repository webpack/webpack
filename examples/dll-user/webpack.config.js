var path = require("path");
var webpack = require("../../");
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/js/alpha-manifest.json")
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/js/beta-manifest.json")
		})
	]
};
