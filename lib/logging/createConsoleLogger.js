/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { LogType } = require("./Logger");

/** @typedef {import("./Logger").LogTypeEnum} LogTypeEnum */
/** @typedef {import("../../declarations/WebpackOptions").FilterTypes} FilterTypes */
/** @typedef {import("../../declarations/WebpackOptions").FilterItemTypes} FilterItemTypes */

/** @typedef {function(string): boolean} FilterFunction */

/**
 * @typedef {Object} LoggerOptions
 * @property {false|true|"none"|"error"|"warn"|"info"|"log"|"verbose"} options.level loglevel
 * @property {FilterTypes|boolean} options.debug filter for debug logging
 */

/**
 * @param {FilterItemTypes} item an input item
 * @returns {FilterFunction} filter funtion
 */
const filterToFunction = item => {
	if (typeof item === "string") {
		const regExp = new RegExp(
			`[\\\\/]${item.replace(
				// eslint-disable-next-line no-useless-escape
				/[-[\]{}()*+?.\\^$|]/g,
				"\\$&"
			)}([\\\\/]|$|!|\\?)`
		);
		return ident => regExp.test(ident);
	}
	if (item && typeof item === "object" && typeof item.test === "function") {
		return ident => item.test(ident);
	}
	if (typeof item === "function") {
		return item;
	}
	if (typeof item === "boolean") {
		return () => item;
	}
};

/**
 * @enum {number} */
const LogLevel = {
	none: 6,
	false: 6,
	error: 5,
	warn: 4,
	info: 3,
	log: 2,
	true: 2,
	verbose: 1
};

/**
 * @param {LoggerOptions} options options object
 * @returns {function(string, LogTypeEnum, any[]): void} logging function
 */
module.exports = ({ level = "info", debug = false }) => {
	const debugFilters =
		typeof debug === "boolean"
			? [() => debug]
			: /** @type {FilterItemTypes[]} */ ([])
					.concat(debug)
					.map(filterToFunction);
	/** @type {number} */
	const loglevel = LogLevel[`${level}`] || 0;

	/**
	 * @param {string} name name of the logger
	 * @param {LogTypeEnum} type type of the log entry
	 * @param {any[]} args arguments of the log entry
	 * @returns {void}
	 */
	const logger = (name, type, args) => {
		const labeledArgs = (prefix = "") => {
			if (Array.isArray(args)) {
				if (args.length > 0 && typeof args[0] === "string") {
					return [`${prefix}[${name}] ${args[0]}`, ...args.slice(1)];
				} else {
					return [`${prefix}[${name}]`, ...args];
				}
			} else {
				return [];
			}
		};
		const debug = debugFilters.some(f => f(name));
		switch (type) {
			case LogType.debug:
				if (!debug) return;
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.debug === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.debug(...labeledArgs());
				} else {
					console.log(...labeledArgs());
				}
				break;
			case LogType.log:
				if (!debug && loglevel > LogLevel.log) return;
				console.log(...labeledArgs());
				break;
			case LogType.info:
				if (!debug && loglevel > LogLevel.info) return;
				console.info(...labeledArgs("<i> "));
				break;
			case LogType.warn:
				if (!debug && loglevel > LogLevel.warn) return;
				console.warn(...labeledArgs("<w> "));
				break;
			case LogType.error:
				if (!debug && loglevel > LogLevel.error) return;
				console.error(...labeledArgs("<e> "));
				break;
			case LogType.trace:
				if (!debug) return;
				console.trace();
				break;
			case LogType.group:
				if (!debug && loglevel > LogLevel.log) return;
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.group === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.group(...labeledArgs());
				} else {
					console.log(...labeledArgs());
				}
				break;
			case LogType.groupCollapsed:
				if (!debug && loglevel > LogLevel.log) return;
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.groupCollapsed === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.groupCollapsed(...labeledArgs());
				} else {
					console.log(...labeledArgs("<g> "));
				}
				break;
			case LogType.groupEnd:
				if (!debug && loglevel > LogLevel.log) return;
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.groupEnd === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.groupEnd();
				} else {
					console.log(...labeledArgs("</g> "));
				}
				break;
			case LogType.time:
				if (!debug && loglevel > LogLevel.log) return;
				console.log(
					`[${name}] ${args[0]}: ${args[1] * 1000 + args[2] / 1000000}ms`
				);
				break;
			case LogType.profile:
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.profile === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.profile(...labeledArgs());
				}
				break;
			case LogType.profileEnd:
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.profileEnd === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.profileEnd(...labeledArgs());
				}
				break;
			case LogType.clear:
				if (!debug && loglevel > LogLevel.log) return;
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				if (typeof console.clear === "function") {
					// eslint-disable-next-line node/no-unsupported-features/node-builtins
					console.clear();
				}
				break;
			default:
				throw new Error(`Unexpected LogType ${type}`);
		}
	};
	return logger;
};
