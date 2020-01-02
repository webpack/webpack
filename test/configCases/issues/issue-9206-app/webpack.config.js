var webpack = require("../../../../");

module.exports = {
	mode: "development",
	entry: ["./index.js"],
	plugins: [
		new webpack.DllReferencePlugin({
			name: "../issue-9206-vendor/bundle0.js",
			scope: "issue-9206-vendor",
			sourceType: "commonjs2",
			manifest: require("../../../js/config/issues/issue-9206-vendor/manifest0.json")
		})
	]
};
