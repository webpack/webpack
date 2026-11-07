"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function (source) {
	const logger = this.getLogger("loader-thread-test");
	logger.info("worker info");
	logger.getChildLogger("child").warn("worker child");
	return source;
};
