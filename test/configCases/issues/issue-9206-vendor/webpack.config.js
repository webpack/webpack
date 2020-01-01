var path = require("path");
var webpack = require("../../../../");

module.exports = {
	mode: "development",
	resolve: { alias: {} },
	entry: {
		components: ["./beta"]
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
				"../../../js/config/issues/issue-9206-vendor/manifest0.json"
			)
		})
	]
};
