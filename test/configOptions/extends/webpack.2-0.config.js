module.exports = {
	extends: [
		"./test/configOptions/extends/webpack.1-0.config.js",
		"./test/configOptions/extends/webpack.2-1.config.js"
	],
	resolve: {
		alias: {
			config: './webpack.2-0.config.js'
		}
	}
};
