/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SyncBailHook = require("tapable/lib/SyncBailHook");
const { Logger } = require("./Logger");
const createConsoleLogger = require("./createConsoleLogger");

/** @type {createConsoleLogger.LoggerOptions} */
let currentDefaultLoggerOptions = {
	level: "info",
	debug: false,
	getConsole: () => console
};
let currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);

/**
 * @param {string} name name of the logger
 * @param {object=} options of the logger
 * @returns {Logger} a logger
 */
exports.getLogger = (name, options) => {
	return new Logger(
		(type, args) => {
			if (exports.hooks.log.call(name, type, args, options) === undefined) {
				currentDefaultLogger(name, type, args, options);
			}
		},
		(childName, options) => exports.getLogger(`${name}/${childName}`, options)
	);
};

/**
 * @param {createConsoleLogger.LoggerOptions} options new options, merge with old options
 * @returns {void}
 */
exports.configureDefaultLogger = options => {
	Object.assign(currentDefaultLoggerOptions, options);
	currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);
};

exports.hooks = {
	log: new SyncBailHook(["origin", "type", "args", "options"])
};
