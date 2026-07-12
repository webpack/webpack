/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import fs from "graceful-fs";
import createConsoleLogger from "../logging/createConsoleLogger.js";
import { CachedInputFileSystem } from "../util/enhanced-resolve.js";
import NodeWatchFileSystem from "./NodeWatchFileSystem.js";
import nodeConsole from "./nodeConsole.js";

/** @typedef {import("../../declarations/WebpackOptions.js").InfrastructureLogging} InfrastructureLogging */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../util/fs.js").InputFileSystem} InputFileSystem */

/**
 * Defines the node environment plugin options type used by this module.
 * @typedef {object} NodeEnvironmentPluginOptions
 * @property {InfrastructureLogging} infrastructureLogging infrastructure logging options
 */

const PLUGIN_NAME = "NodeEnvironmentPlugin";

class NodeEnvironmentPlugin {
	/**
	 * Creates an instance of NodeEnvironmentPlugin.
	 * @param {NodeEnvironmentPluginOptions} options options
	 */
	constructor(options) {
		/** @type {NodeEnvironmentPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { infrastructureLogging } = this.options;
		compiler.infrastructureLogger = createConsoleLogger({
			level: infrastructureLogging.level || "info",
			debug: infrastructureLogging.debug || false,
			console:
				infrastructureLogging.console ||
				nodeConsole({
					colors: infrastructureLogging.colors,
					appendOnly: infrastructureLogging.appendOnly,
					stream:
						/** @type {NodeJS.WritableStream} */
						(infrastructureLogging.stream),
					compiler
				})
		});
		// @ts-expect-error need to fix on enhanced-resolve side
		compiler.inputFileSystem = new CachedInputFileSystem(fs, 60000);
		const inputFileSystem =
			/** @type {InputFileSystem} */
			(compiler.inputFileSystem);
		compiler.outputFileSystem = fs;
		compiler.intermediateFileSystem = fs;
		compiler.watchFileSystem = new NodeWatchFileSystem(inputFileSystem);
		compiler.hooks.beforeRun.tap(PLUGIN_NAME, (compiler) => {
			if (
				compiler.inputFileSystem === inputFileSystem &&
				inputFileSystem.purge
			) {
				compiler.fsStartTime = Date.now();
				inputFileSystem.purge();
			}
		});
	}
}

export default NodeEnvironmentPlugin;

export { NodeEnvironmentPlugin as "module.exports" };
