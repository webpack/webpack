var path = require("path");
var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require("../../../js/config/dll-plugin/manifest0.json"),
			name: "../0-create-dll/dll.js",
			context: path.resolve(__dirname, "../0-create-dll"),
			sourceType: "commonjs2"
		})
	]
};
