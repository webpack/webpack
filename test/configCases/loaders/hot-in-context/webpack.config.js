const webpack = require("../../../../");
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		// no hmr
	},
	{
		// with hmr
		plugins: [new webpack.HotModuleReplacementPlugin()]
	}
];
