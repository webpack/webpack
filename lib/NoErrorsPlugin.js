"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class NoErrorsPlugin {
	apply(compiler) {
		let deprecationReported = false;
		compiler.plugin("should-emit", function(compilation) {
			if(!deprecationReported) {
				compilation.warnings.push(new Error("webpack: Using NoErrorsPlugin is deprecated.\nUse NoEmitOnErrorsPlugin instead.\n"));
				deprecationReported = true;
			}
			if(compilation.errors.length > 0) {
				return false;
			}
		});
		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("should-record", () => {
				if(compilation.errors.length > 0) {
					return false;
				}
			});
		});
	}
}
module.exports = NoErrorsPlugin;
