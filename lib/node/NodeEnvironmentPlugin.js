/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var NodeWatchFileSystem = require("./NodeWatchFileSystem");
var NodeOutputFileSystem = require("./NodeOutputFileSystem");
var NodeJsInputFileSystem = require("enhanced-resolve/lib/NodeJsInputFileSystem");
var CachedInputFileSystem = require("enhanced-resolve/lib/CachedInputFileSystem");

function NodeEnvironmentPlugin() {
}
module.exports = NodeEnvironmentPlugin;
NodeEnvironmentPlugin.prototype.apply = function(compiler) {
	compiler.inputFileSystem = new NodeJsInputFileSystem();
	compiler.inputFileSystem = new CachedInputFileSystem(compiler.inputFileSystem, 6000);
	compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
	compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
	compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;
	compiler.outputFileSystem = new NodeOutputFileSystem();
	compiler.watchFileSystem = new NodeWatchFileSystem(compiler.inputFileSystem);
};