/* eslint-disable node/no-unsupported-features/node-builtins */
module.exports = function(source) {
	const logger = this.getLogger ? this.getLogger() : console;
	logger.time("Measure");
	logger.error("An error");
	logger.warn("A %s", "warning");
	logger.group("Unimportant");
	logger.info("Info message");
	logger.log("Just log");
	logger.debug("Just debug");
	logger.timeLog("Measure");
	logger.groupCollapsed("Nested");
	logger.log("Log inside collapsed group");
	logger.groupEnd("Nested");
	logger.trace();
	logger.timeEnd("Measure");
	logger.clear();
	logger.log("After clear");
	this.getLogger("Named Logger").debug("Message with named logger");
	return source;
};
