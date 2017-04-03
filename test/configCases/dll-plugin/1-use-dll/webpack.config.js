var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			//eslint-disable-next-line
			manifest: require("../../../js/config/dll-plugin/manifest0.json"),
			name: "../0-create-dll/dll.js",
			scope: "dll",
			sourceType: "commonjs2",
			extensions: [".js", ".jsx"]
		}),
		new webpack.NamedModulesPlugin()
	]
};
