/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NodeWatchFileSystem = require("./NodeWatchFileSystem");
var NodeOutputFileSystem = require("./NodeOutputFileSystem");
var NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
var CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");

function NodeEnvironmentPlugin() {}
module.exports = NodeEnvironmentPlugin;
NodeEnvironmentPlugin.prototype.apply = function(compiler) {
	compiler.inputFileSystem = new CachedInputFileSystem(new NodeJsInputFileSystem(), 60000);
	var inputFileSystem = compiler.inputFileSystem;
	compiler.outputFileSystem = new NodeOutputFileSystem();
	compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
	compiler.plugin("before-run", function(compiler, callback) {
		if(compiler.inputFileSystem === inputFileSystem)
			inputFileSystem.purge();
		callback();
	});
};
