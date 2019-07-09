/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
const fs = require("graceful-fs");
const NodeWatchFileSystem = require("./NodeWatchFileSystem");

/** @typedef {import("../Compiler")} Compiler */

class NodeEnvironmentPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.inputFileSystem = new CachedInputFileSystem(fs, 60000);
		const inputFileSystem = compiler.inputFileSystem;
		compiler.outputFileSystem = fs;
		compiler.intermediateFileSystem = fs;
		compiler.watchFileSystem = new NodeWatchFileSystem(
			compiler.inputFileSystem
		);
		compiler.hooks.beforeRun.tap("NodeEnvironmentPlugin", compiler => {
			if (compiler.inputFileSystem === inputFileSystem) {
				inputFileSystem.purge();
			}
		});
	}
}

module.exports = NodeEnvironmentPlugin;
