/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class NewWatchingPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation) {
			compilation.warnings.push(new Error("The 'NewWatchingPlugin' is no longer necessary (now default)"));
		});
	}
}

module.exports = NewWatchingPlugin;
