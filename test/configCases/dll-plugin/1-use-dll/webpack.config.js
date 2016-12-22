var path = require("path");
var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require(path.resolve(__dirname, "../../../js/config/dll-plugin/manifest0.json")),
			name: path.resolve(__dirname, "../0-create-dll/dll.js"),
			scope: "dll",
			sourceType: "commonjs2",
			extensions: ['.js', '.jsx']
		})
	]
}
