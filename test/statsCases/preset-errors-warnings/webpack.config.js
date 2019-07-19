class MyPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("MyPlugin", compilation => {
			const logger = compilation.getLogger("MyPlugin");
			logger.group("Group");
			logger.error("Error");
			logger.warn("Warning");
			logger.info("Info");
			logger.log("Log");
			logger.debug("Debug");
			logger.groupCollapsed("Collaped group");
			logger.log("Log inside collapsed group");
			logger.groupEnd();
			logger.groupEnd();
		});
	}
}

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-warnings",
	plugins: [new MyPlugin()]
};
