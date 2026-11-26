"use strict";

const fs = require("fs");
const path = require("path");

/** @import { Compiler, MultiCompiler, Watching } from "webpack" */

module.exports = {
	/**
	 * @param {Error} error fatal watch error
	 * @param {Compiler | MultiCompiler} compiler watched compiler
	 * @returns {Promise<void>} recovery without another edit
	 */
	watchError(error, compiler) {
		expect(/** @type {NodeJS.ErrnoException} */ (error).code).toBe("EISDIR");
		if ("compilers" in compiler) throw error;
		const outside = path.join(
			compiler.outputPath,
			"..",
			"outside-write-failure"
		);
		// the failed write left the hot update it was replacing
		expect(fs.existsSync(path.join(outside, "0.hot-update.json"))).toBe(true);
		fs.rmdirSync(path.join(outside, "1.hot-update.json"));
		const watching = /** @type {Watching} */ (compiler.watching);
		return new Promise((resolve, reject) => {
			process.nextTick(() => {
				watching.invalidate((recoveryError) => {
					if (recoveryError) reject(recoveryError);
					else resolve();
				});
			});
		});
	}
};
