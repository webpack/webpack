"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function (source) {
	const logger = this.getLogger("loader-thread-test");
	logger.info("worker info");
	logger.getChildLogger("child").warn("worker child");
	// same name: cached, no second main-thread lookup
	this.getLogger("loader-thread-test").log("cached");
	// default name and a function child name
	this.getLogger().info("default logger");
	this.getLogger()
		.getChildLogger(() => "function-child")
		.warn("worker fn child");
	return source;
};
