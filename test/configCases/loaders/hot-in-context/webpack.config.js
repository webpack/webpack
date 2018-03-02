const webpack = require("../../../../");
module.exports = [
	{
		// no hmr
	},
	{
		// with hmr
		plugins: [new webpack.HotModuleReplacementPlugin()]
	}
];
