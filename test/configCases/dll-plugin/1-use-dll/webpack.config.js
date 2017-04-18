var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require("../../../js/config/dll-plugin/manifest0.json"), // eslint-disable-line node/no-missing-require
			name: "../0-create-dll/dll.js",
			scope: "dll",
			sourceType: "commonjs2",
			extensions: [".js", ".jsx"]
		}),
		new webpack.NamedModulesPlugin()
	]
};
