var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DllReferencePlugin({
			// eslint-disable-next-line n/no-missing-require
			manifest: require("../../../js/config/dll-plugin-side-effects/manifest0.json"),
			name: "../0-create-dll/dll.js",
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
