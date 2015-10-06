module.exports = {
	debug: false,
	extend: {
		"./test/configOptions/extend/webpack.2-0.config.js": function(config) {
			config.visited = ["webpack.2-0.config.js"];

			return config;
		},

		"./test/configOptions/extend/webpack.3-1.config.js": true
	},
	resolve: {
		alias: {
			config: './webpack.3-0.config.js'
		}
	}
};
