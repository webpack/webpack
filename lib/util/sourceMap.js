/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Furkan Erdem @log101
*/

"use strict";

const { SourceMapConsumer } = require("source-map");

/** @typedef {import("../Compilation").ModuleCallback} ModuleCallback */
/** @typedef {import("../Dependency").RealDependencyLocation} RealDependencyLocation */
/** @typedef {import("../WebpackError")} WebpackError */

/**
 * Updates error location (line number and column) using sourcemap
 *
 * @param {WebpackError} err The error with the misaligned location.
 * @param {ModuleCallback} callback callback
 * @returns {Promise<void>}
 */
const updateErrorLocation = async (err, callback) => {
	let consumer;
	try {
		consumer = await new SourceMapConsumer(err.module.originalSource().map());
	} catch (_err) {
		return callback(err);
	}

	// Have to check to avoid type error
	if ("start" in err.loc) {
		// find the original positions
		const startLoc = consumer.originalPositionFor({
			line: err.loc.start.line,
			column: err.loc.start.column
		});

		// update the error start location
		err.loc.start.line = startLoc.line;
		err.loc.start.column = startLoc.column;
	}

	// end field is optional, check if exists
	if ("end" in err.loc) {
		// find the original positions
		const endLoc = consumer.originalPositionFor({
			line: err.loc.end.line,
			column: err.loc.end.column
		});

		// update the error end location
		err.loc.end.line = endLoc.line;
		err.loc.end.column = endLoc.column;
	}

	return callback(err);
};

module.exports = updateErrorLocation;
