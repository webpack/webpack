var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		moduleIds: "named"
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require("../../../js/config/dll-plugin-entry/manifest0.json"), // eslint-disable-line n/no-missing-require
			name: "../0-create-dll/dll.js",
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
