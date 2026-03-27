/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");

/** @typedef {import("../Module")} Module */

/**
 * @typedef {object} CycleChainEntry
 * @property {string} modulePath the formatted module path
 * @property {string} locationInfo the formatted location information
 */

class BuildCycleError extends WebpackError {
	/**
	 * Creates an instance of BuildCycleError.
	 * @param {Module} module the module starting the cycle
	 * @param {CycleChainEntry[]=} cycleChain the formatted dependency chain showing the cycle
	 */
	constructor(module, cycleChain) {
		const baseMessage =
			"There is a circular build dependency, which makes it impossible to create this module";
		super(baseMessage);

		/** @type {string} */
		this.name = "BuildCycleError";
		/** @type {Module} */
		this.module = module;

		// Enhance message with dependency chain information if available
		if (cycleChain && cycleChain.length > 0) {
			/** @type {string[]} */
			const lines = [];
			lines.push("Circular dependency detected");
			lines.push("");
			lines.push("Circular dependency chain:");

			for (let i = 0; i < cycleChain.length; i++) {
				const entry = cycleChain[i];
				// Use arrow for all entries except the last one which closes the cycle
				const arrow = i < cycleChain.length - 1 ? "→" : "↻";
				lines.push(`  ${arrow} ${entry.modulePath}${entry.locationInfo}`);
			}

			lines.push("");
			lines.push("To fix this circular dependency:");
			if (cycleChain.length === 2) {
				// Simple 2-module cycle - provide specific suggestion
				const module1Path = cycleChain[0].modulePath;
				const module2Path = cycleChain[1].modulePath;
				if (module1Path && module2Path) {
					lines.push(
						`  - Extract shared code from ${module1Path} and ${module2Path} to a separate module`
					);
				} else {
					lines.push(
						"  - Extract shared code from the modules to a separate module"
					);
				}
			} else {
				lines.push(
					"  - Extract shared code from the modules to a separate module"
				);
			}
			lines.push(
				"  - Use dynamic imports: import('./module').then(...)"
			);
			lines.push(
				"  - Consider refactoring the module structure to remove the dependency cycle"
			);

			const formattedDetails = lines.join("\n");
			// Store enhanced information in details (displayed in stats)
			this.details = formattedDetails;
			// Also update message to include the enhanced information
			// This ensures the enhanced message is shown in all contexts
			this.message = `${baseMessage}\n\n${formattedDetails}`;
		}
	}
}

/** @type {typeof BuildCycleError} */
module.exports = BuildCycleError;
