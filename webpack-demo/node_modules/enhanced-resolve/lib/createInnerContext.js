/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").ResolveContext} ResolveContext */

/**
 * @param {ResolveContext} options options for inner context
 * @param {null|string} message message to log
 * @returns {ResolveContext} inner context
 */
module.exports = function createInnerContext(options, message) {
	let messageReported = false;
	let innerLog = undefined;
	if (options.log) {
		if (message) {
			/**
			 * @param {string} msg message
			 */
			innerLog = msg => {
				if (!messageReported) {
					/** @type {(function(string): void)} */
					(options.log)(message);
					messageReported = true;
				}

				/** @type {(function(string): void)} */
				(options.log)("  " + msg);
			};
		} else {
			innerLog = options.log;
		}
	}

	return {
		log: innerLog,
		yield: options.yield,
		fileDependencies: options.fileDependencies,
		contextDependencies: options.contextDependencies,
		missingDependencies: options.missingDependencies,
		stack: options.stack
	};
};
