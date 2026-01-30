/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const formatLocation = require("../formatLocation");

/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RequestShortener")} RequestShortener */

/**
 * @typedef {object} CycleChainEntry
 * @property {Module} module the module in the cycle
 * @property {Module | null} originModule the module that depends on this module
 * @property {import("../Dependency").DependencyLocation | undefined} location location of the dependency
 */

class BuildCycleError extends WebpackError {
	/**
	 * Creates an instance of BuildCycleError.
	 * @param {Module} module the module starting the cycle
	 * @param {CycleChainEntry[]=} cycleChain the full dependency chain showing the cycle
	 * @param {ModuleGraph=} moduleGraph the module graph to get dependency information
	 * @param {RequestShortener=} requestShortener the request shortener for formatting paths
	 */
	constructor(module, cycleChain, moduleGraph, requestShortener) {
		const baseMessage =
			"There is a circular build dependency, which makes it impossible to create this module";
		super(baseMessage);

		this.name = "BuildCycleError";
		this.module = module;
		/** @type {CycleChainEntry[] | undefined} */
		this.cycleChain = cycleChain;
		/** @type {ModuleGraph | undefined} */
		this._moduleGraph = moduleGraph;
		/** @type {RequestShortener | undefined} */
		this._requestShortener = requestShortener;

		// Enhance message with dependency chain information if available
		if (cycleChain && cycleChain.length > 0) {
			const formattedDetails = this.getFormattedMessage();
			// Store enhanced information in details (displayed in stats)
			this.details = formattedDetails;
			// Also update message to include the enhanced information
			// This ensures the enhanced message is shown in all contexts
			this.message = `${baseMessage}\n\n${formattedDetails}`;
		}
	}

	/**
	 * Formats the error message with dependency chain information
	 * @returns {string} formatted error message
	 */
	getFormattedMessage() {
		if (!this.cycleChain || this.cycleChain.length === 0) {
			return "";
		}

		const requestShortener = this._requestShortener;
		const moduleGraph = this._moduleGraph;

		/** @type {string[]} */
		const lines = [];
		lines.push("Circular dependency detected");
		lines.push("");
		lines.push("Circular dependency chain:");

		for (let i = 0; i < this.cycleChain.length; i++) {
			const entry = this.cycleChain[i];
			const module = entry.module;

			// Get module identifier (file path)
			let modulePath = "";
			if (module && typeof module.identifier === "function") {
				modulePath = module.identifier();
				if (requestShortener) {
					modulePath = requestShortener.shorten(modulePath) || modulePath;
				}
			} else if (module && "resource" in module && module.resource) {
				// resource property exists on NormalModule
				modulePath = /** @type {any} */ (module).resource;
				if (requestShortener) {
					modulePath = requestShortener.shorten(modulePath) || modulePath;
				}
			} else if (module) {
				modulePath = String(module);
			}

			// Get location information
			let locationInfo = "";
			if (entry.location) {
				const formattedLoc = formatLocation(entry.location);
				if (formattedLoc) {
					locationInfo = ` (line ${formattedLoc})`;
				}
			} else if (moduleGraph && entry.originModule) {
				// Try to find dependency location from module graph
				const connections = moduleGraph.getOutgoingConnections(
					entry.originModule
				);
				for (const connection of connections) {
					if (connection.module === module && connection.dependency) {
						const loc = connection.dependency.loc;
						if (loc) {
							const formattedLoc = formatLocation(loc);
							if (formattedLoc) {
								locationInfo = ` (line ${formattedLoc})`;
								break;
							}
						}
					}
				}
			}

			// Use arrow for all entries except the last one which closes the cycle
			const arrow = i < this.cycleChain.length - 1 ? "→" : "↻";
			lines.push(`  ${arrow} ${modulePath}${locationInfo}`);
		}

		lines.push("");
		lines.push("To fix this circular dependency:");
		if (this.cycleChain.length === 2) {
			// Simple 2-module cycle - provide specific suggestion
			const module1 = this.cycleChain[0].module;
			const module2 = this.cycleChain[1].module;
			let module1Path = "";
			let module2Path = "";
			if (module1 && typeof module1.identifier === "function") {
				module1Path = requestShortener
					? requestShortener.shorten(module1.identifier()) || module1.identifier()
					: module1.identifier();
			}
			if (module2 && typeof module2.identifier === "function") {
				module2Path = requestShortener
					? requestShortener.shorten(module2.identifier()) || module2.identifier()
					: module2.identifier();
			}
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

		return lines.join("\n");
	}
}

module.exports = BuildCycleError;
