module.exports = {
	extend: {
		"./test/configOptions/extend/webpack.0.config.js": function(config) {
			config.visited = ["webpack.0.config.js"];

			return config;
		},
		"./test/configOptions/extend/webpack.1-1.config.js": function(config) {
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
