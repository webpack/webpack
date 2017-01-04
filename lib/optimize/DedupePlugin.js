"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class DedupePlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.warnings.push(new Error("DedupePlugin: This plugin was removed from webpack. remove it from configuration."));
		});
	}
}
module.exports = DedupePlugin;
