const webpack = require("../../../../");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	output: {
		libraryTarget: "commonjs2"
	},
	externals: {
		external: ["webpack", "version"]
	},
	plugins: [
		new webpack.DefinePlugin({
			NODE_VERSION: JSON.stringify(process.version),
			EXPECTED: JSON.stringify(webpack.version)
		})
	]
};
