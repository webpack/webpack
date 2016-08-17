/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var async = require("async");

function FlagInitialModulesAsUsedPlugin() {}
module.exports = FlagInitialModulesAsUsedPlugin;
FlagInitialModulesAsUsedPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("after-optimize-chunks", function(chunks) {
			chunks.forEach(function(chunk) {
				if(!chunk.isInitial()) {
					return;
				}
				chunk.modules.forEach(function(module) {
					module.usedExports = true;
				});
			});
		});
	});
};
