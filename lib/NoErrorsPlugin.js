/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

let deprecationReported = false;

class NoErrorsPlugin {
	apply(compiler) {
		compiler.plugin("should-emit", (compilation) => {
			if(!deprecationReported) {
				compilation.warnings.push("webpack: Using NoErrorsPlugin is deprecated.\n" +
					"Use NoEmitOnErrorsPlugin instead.\n");
				deprecationReported = true;
			}
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

module.exports = NoErrorsPlugin;
