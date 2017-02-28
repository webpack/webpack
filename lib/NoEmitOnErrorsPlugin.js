/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class NoEmitOnErrorsPlugin {
	apply(compiler) {
		compiler.plugin("should-emit", (compilation) => {
			if(compilation.errors.length > 0)
				return false;
		});
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("should-record", () => {
				if(compilation.errors.length > 0)
					return false;
			});
		});
	}
}

module.exports = NoEmitOnErrorsPlugin;
