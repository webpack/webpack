/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { LogType } = require("./Logger");

/** @typedef {import("./Logger").LogTypeEnum} LogTypeEnum */

/**
 * @param {string} name name of the logger
 * @param {LogTypeEnum} type type of the log entry
 * @param {any[]} args arguments of the log entry
 */
module.exports = (name, type, args) => {
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
	switch (type) {
		case LogType.debug:
			// eslint-disable-next-line node/no-unsupported-features/node-builtins
			if (typeof console.debug === "function") {
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				console.debug(...labeledArgs());
			} else {
				console.log(...labeledArgs());
			}
			break;
		case LogType.log:
			console.log(...labeledArgs());
			break;
		case LogType.info:
			console.info(...labeledArgs("<i> "));
			break;
		case LogType.warn:
			console.warn(...labeledArgs("<w> "));
			break;
		case LogType.error:
			console.error(...labeledArgs("<e> "));
			break;
		case LogType.trace:
			console.trace();
			break;
		case LogType.group:
			// eslint-disable-next-line node/no-unsupported-features/node-builtins
			if (typeof console.group === "function") {
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				console.group(...labeledArgs());
			} else {
				console.log(...labeledArgs());
			}
			break;
		case LogType.groupCollapsed:
			// eslint-disable-next-line node/no-unsupported-features/node-builtins
			if (typeof console.groupCollapsed === "function") {
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				console.groupCollapsed(...labeledArgs());
			} else {
				console.log(...labeledArgs("<g> "));
			}
			break;
		case LogType.groupEnd:
			// eslint-disable-next-line node/no-unsupported-features/node-builtins
			if (typeof console.groupEnd === "function") {
				// eslint-disable-next-line node/no-unsupported-features/node-builtins
				console.groupEnd();
			} else {
				console.log(...labeledArgs("</g> "));
			}
			break;
		case LogType.time:
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
