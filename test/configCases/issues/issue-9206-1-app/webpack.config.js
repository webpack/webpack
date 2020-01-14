var webpack = require("../../../../");

module.exports = {
	mode: "development",
	entry: ["./index.js"],
	plugins: [
		new webpack.DllReferencePlugin({
			name: "../issue-9206-0-vendor/bundle0.js",
			scope: "issue-9206-0-vendor",
			sourceType: "commonjs2",
			// eslint-disable-next-line node/no-missing-require
			manifest: require("../../../js/config/issues/issue-9206-0-vendor/manifest0.json")
		})
	]
};
