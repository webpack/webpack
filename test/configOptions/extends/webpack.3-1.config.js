var webpack = require("./../../../lib/webpack");

module.exports = {
	debug: false,
	plugins: [
		new webpack.optimize.UglifyJsPlugin()
	],
	resolve: {
		alias: {
			config: './webpack.3-1.config.js'
		}
	}
};
