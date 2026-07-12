/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { SyncBailHook } from "tapable";
import { Logger } from "./Logger.js";
import createConsoleLogger from "./createConsoleLogger.js";

/** @type {import("./createConsoleLogger.js").LoggerOptions} */
const currentDefaultLoggerOptions = {
	level: "info",
	debug: false,
	console
};
let currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);

/**
 * Processes the provided create console logger.logger option.
 * @param {import("./createConsoleLogger.js").LoggerOptions} options new options, merge with old options
 * @returns {void}
 */
export const configureDefaultLogger = (options) => {
	Object.assign(currentDefaultLoggerOptions, options);
	currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);
};

/**
 * Returns a logger.
 * @param {string} name name of the logger
 * @returns {Logger} a logger
 */
export const getLogger = (name) =>
	new Logger(
		(type, args) => {
			if (hooks.log.call(name, type, args) === undefined) {
				currentDefaultLogger(name, type, args);
			}
		},
		(childName) => getLogger(`${name}/${childName}`)
	);

export const hooks = {
	log: new SyncBailHook(["origin", "type", "args"])
};
