/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
const NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
const NodeMemoryFileSystem = require("./NodeOutputMemoryFileSystem");
const NodeOutputFileSystem = require("./NodeOutputFileSystem");
const NodeWatchFileSystem = require("./NodeWatchFileSystem");

/** @typedef {import("../Compiler")} Compiler */

class NodeEnvironmentPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const isMemoryFS = compiler.options.memory ? true : false;	
		const {MemoryFileSystem} = isMemoryFS ? new NodeMemoryFileSystem() : null;
		if (isMemoryFS) {
			// @ts-ignore
			try {
				const fs = require('fs');
				fs.statSync(compiler.options.entry);
			} catch(err) {
				if(err.code === 'ENOENT') {
					MemoryFileSystem.mkdirpSync(process.cwd());
					const noopEntry = process.cwd() + '/index.js';
					MemoryFileSystem.writeFileSync(noopEntry, 'console.log("hi")', 'utf8');
					compiler.options.entry = noopEntry;
				}
			}
			compiler.memory = MemoryFileSystem;
		}

		compiler.inputFileSystem = new CachedInputFileSystem(
			isMemoryFS ? MemoryFileSystem : new NodeJsInputFileSystem(),
			60000
		);

		const inputFileSystem = compiler.inputFileSystem;
		compiler.outputFileSystem =	isMemoryFS ? MemoryFileSystem : new NodeOutputFileSystem(),
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
