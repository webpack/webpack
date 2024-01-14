var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			// eslint-disable-next-line n/no-missing-require
			manifest: require("../../../js/config/dll-plugin/issue-10475.json"),
			name: "../0-issue-10475/dll.js",
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
