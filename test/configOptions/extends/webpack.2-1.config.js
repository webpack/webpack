var webpack = require("./../../../lib/webpack");

module.exports = {
	debug: true,
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(true)
	],
	resolve: {
		alias: {
			config: './webpack.2-1.config.js'
		}
	}
};
