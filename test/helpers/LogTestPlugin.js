"use strict";

/** @typedef {import("../../").Compiler} Compiler */
/** @typedef {import("../../").Compilation} Compilation */

module.exports = class LogTestPlugin {
	/**
	 * @param {boolean=} noTraced noTraced
	 */
	constructor(noTraced) {
		this.noTraced = noTraced;
	}

	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		/**
		 * @param {ReturnType<Compilation["getLogger"]>} logger logger
		 */
		const logSome = logger => {
			logger.group("Group");
			if (!this.noTraced) {
				logger.error("Error");
				logger.warn("Warning");
			}
			logger.info("Info");
			logger.log("Log");
			logger.debug("Debug");
			logger.groupCollapsed("Collapsed group");
			logger.log("Log inside collapsed group");
			logger.group("Inner group");
			logger.log("Inner inner message");
			logger.groupEnd();
			logger.groupEnd();
			logger.log("Log");
			logger.groupEnd();
			logger.log("End");
		};
		logSome(compiler.getInfrastructureLogger("LogTestPlugin"));
		compiler.hooks.compilation.tap("LogTestPlugin", compilation => {
			const logger = compilation.getLogger("LogTestPlugin");
			logSome(logger);

			const otherLogger = compilation.getLogger("LogOtherTestPlugin");
			otherLogger.debug("debug message only");
		});
	}
};
