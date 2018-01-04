/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class NoEmitOnErrorsPlugin {
	apply(compiler) {
		compiler.plugin("should-emit", (compilation) => {
			if(compilation.getStats().hasErrors())
				return false;
		});
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("should-record", () => {
				if(compilation.getStats().hasErrors())
					return false;
			});
		});
	}
}

module.exports = NoEmitOnErrorsPlugin;
