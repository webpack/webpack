module.exports = {
	extend: [
		"./test/configOptions/extend/webpack.1-0.config.js",
		"./test/configOptions/extend/webpack.2-1.config.js"
	],
	resolve: {
		alias: {
			config: './webpack.2-0.config.js'
		}
	}
};
