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
		lazyCompilation: {
			entries: false
		}
	},
	devServer: {
		hot: true,
		publicPath: "/dist/"
	},
	plugins: [new HotModuleReplacementPlugin()]
};
