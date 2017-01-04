"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NodeWatchFileSystem = require("./NodeWatchFileSystem");
const NodeOutputFileSystem = require("./NodeOutputFileSystem");
// todo: these are exported via resolve namespace
const NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
const CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");
class NodeEnvironmentPlugin {
	apply(compiler) {
		// todo: useless assignment?
		compiler.inputFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 60000);
		const inputFileSystem = compiler.inputFileSystem;
		compiler.outputFileSystem = new NodeOutputFileSystem();
		compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
		compiler.plugin("before-run", function(compiler, callback) {
			if(compiler.inputFileSystem === inputFileSystem) {
				inputFileSystem.purge();
			}
			callback();
		});
	}
}
module.exports = NodeEnvironmentPlugin;
