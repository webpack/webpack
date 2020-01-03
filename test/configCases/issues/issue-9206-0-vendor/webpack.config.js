var path = require("path");
var webpack = require("../../../../lib");

module.exports = {
	mode: "development",
	resolve: { alias: {} },
	entry: {
		"issue-9206-0-vendor": ["./beta"]
	},
	output: {
		libraryTarget: "commonjs2",
		library: "[name]"
	},
	plugins: [
		new webpack.DllPlugin({
			name: "[name]",
			path: path.resolve(
				__dirname,
				"../../../js/config/issues/issue-9206-0-vendor/manifest0.json"
			)
		})
	]
};
