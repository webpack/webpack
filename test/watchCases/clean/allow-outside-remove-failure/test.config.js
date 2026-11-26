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
		expect(error.message).toBe("removal failed");
		if ("compilers" in compiler) throw error;
		const outside = path.join(
			compiler.outputPath,
			"..",
			"outside-remove-failure"
		);
		expect(fs.readFileSync(path.join(outside, "old.txt"), "utf8")).toBe(
			"emitted"
		);
		expect(fs.readFileSync(path.join(outside, "new.txt"), "utf8")).toBe(
			"emitted"
		);
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
