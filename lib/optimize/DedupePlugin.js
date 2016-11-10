/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function DedupePlugin() {}
module.exports = DedupePlugin;

DedupePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.warnings.push(new Error("DedupePlugin: This plugin was removed from webpack. remove it from configuration."));
	});
};
