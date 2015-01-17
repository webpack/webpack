/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OldNodeWatchFileSystem = require("./node/OldNodeWatchFileSystem");

function OldWatchingPlugin() {
}
module.exports = OldWatchingPlugin;

OldWatchingPlugin.prototype.apply = function(compiler) {
	compiler.plugin("environment", function() {
		compiler.watchFileSystem = new OldNodeWatchFileSystem(compiler.inputFileSystem);
	});
};
