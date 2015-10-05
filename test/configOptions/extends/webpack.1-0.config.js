var webpack = require("./../../../lib/webpack");

module.exports = {
	extends: {
		"./test/configOptions/extends/webpack.0.config.js": function(config) {
			config.visited = ["webpack.0.config.js"];

			return config;
		},
		"./test/configOptions/extends/webpack.1-1.config.js": function(config) {
			config.visited = ["webpack.1-1.config.js"];

			return config;
		}
	},
	resolve: {
		alias: {
			config: './webpack.1-0.config.js'
		}
	}
};
