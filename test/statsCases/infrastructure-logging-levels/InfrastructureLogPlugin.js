"use strict";

/** @typedef {import("../../../").Compiler} Compiler */

class InfrastructureLogPlugin {
	/**
	 * @param {string} name name of the infrastructure logger
	 */
	constructor(name) {
		this.name = name;
	}

	/**
	 * @param {Compiler} compiler compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const logger = compiler.getInfrastructureLogger(this.name);
		logger.time("Time");
		logger.group("Group");
		logger.error("Error");
		logger.warn("Warning");
		logger.info("Info");
		logger.log("Log");
		logger.debug("Debug");
		logger.groupCollapsed("Collapsed group");
		logger.log("Log inside collapsed group");
		logger.groupEnd();
		logger.groupEnd();
		logger.timeEnd("Time");
	}
}

module.exports = InfrastructureLogPlugin;
