class MyPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("MyPlugin", compilation => {
			const logger = compilation.getLogger("MyPlugin");
			logger.info("Plugin is now active");
			logger.debug("Debug message should not be visible");
			logger.groupCollapsed("Nested");
			logger.log("Log inside collapsed group");
			logger.groupEnd("Nested");

			const otherLogger = compilation.getLogger("MyOtherPlugin");
			otherLogger.debug("debug message only");
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
		loggingDebug: "custom-loader",
		loggingTrace: true
	}
};
