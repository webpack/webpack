"use strict";

const { LogType } = require("./Logger");

/** ANSI color codes */
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const BOLD = "\u001b[1m";
const RESET = "\u001b[39m\u001b[22m";

/** @typedef {import("./Logger").LogTypeEnum} LogTypeEnum */
/** @typedef {import("./Logger").Args} Args */

/**
 * Format a single message based on log type
 * @param {LogTypeEnum} type
 * @param {string} message
 * @returns {string}
 */
const formatMessage = (type, message) => {
	switch (type) {
		case LogType.error:
			return `${BOLD}${RED}${message}${RESET}`;
		case LogType.warn:
			return `${YELLOW}${message}${RESET}`;
		default:
			return message;
	}
};

/**
 * Colorize first string argument only
 * @param {LogTypeEnum} type
 * @param {Args} args
 * @returns {Args}
 */
const colorizeArgs = (type, args) => {
	if (!Array.isArray(args) || args.length === 0) return args;

	const [first, ...rest] = args;
	if (typeof first !== "string") return args;

	return [formatMessage(type, first), ...rest];
};

/**
 * @enum {number}
 */
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
 * @param {object} options
 * @returns {Function}
 */
module.exports = ({ level = "info", debug = false, console }) => {
	const debugFilters =
		typeof debug === "boolean"
			? [() => debug]
			: ([...(Array.isArray(debug) ? debug : [debug])]);

	const loglevel = LogLevel[`${level}`] || 0;

	const logger = (name, type, args) => {
		const labeledArgs = () => {
			if (Array.isArray(args)) {
				if (args.length > 0 && typeof args[0] === "string") {
					return [`[${name}] ${args[0]}`, ...args.slice(1)];
				}
				return [`[${name}]`, ...args];
			}
			return [];
		};

		const finalArgs = colorizeArgs(type, labeledArgs());

		switch (type) {
			case LogType.log:
				if (loglevel > LogLevel.log) return;
				console.log(...finalArgs);
				break;

			case LogType.info:
				if (loglevel > LogLevel.info) return;
				console.info(...finalArgs);
				break;

			case LogType.warn:
				if (loglevel > LogLevel.warn) return;
				console.warn(...finalArgs);
				break;

			case LogType.error:
				if (loglevel > LogLevel.error) return;
				console.error(...finalArgs);
				break;

			default:
				throw new Error(`Unexpected LogType ${type}`);
		}
	};

	return logger;
};
