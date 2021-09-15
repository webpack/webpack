var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require("../../../js/config/dll-plugin/issue-10475.json"), // eslint-disable-line node/no-missing-require
			name: "../0-issue-10475/dll.js",
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
