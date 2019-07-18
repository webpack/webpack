class MyPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("MyPlugin", compilation => {
			const logger = compilation.getLogger("MyPlugin");
			logger.info("Plugin is now active");
			logger.debug("Debug message should not be visible");
		});
	}
}

module.exports = {
	mode: "production",
	entry: "./index",
	performance: false,
	module: {
		rules: [
			{
				test: /index\.js$/,
				use: "custom-loader"
			}
		]
	},
	plugins: [new MyPlugin()],
	stats: {
		colors: true,
		logging: true,
		includeDebugLogging: "custom-loader",
		loggingTrace: true
	}
};
