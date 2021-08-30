const { HotModuleReplacementPlugin } = require("../../");

module.exports = {
	mode: "development",
	entry: {
		main: "./example.js"
	},
	cache: {
		type: "filesystem",
		idleTimeout: 5000
	},
	experiments: {
		lazyCompilation: true
	},
	devServer: {
		hot: true,
		devMiddleware: {
			publicPath: "/dist/"
		}
	},
	plugins: [new HotModuleReplacementPlugin()]
};
