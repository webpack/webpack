/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class DedupePlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.warnings.push(new Error("DedupePlugin: This plugin was removed from webpack. Remove it from your configuration."));
		});
	}
}

module.exports = DedupePlugin;
