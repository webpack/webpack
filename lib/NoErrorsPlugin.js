/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

class NoErrorsPlugin {
	apply(compiler) {
		compiler.plugin("should-emit", util.deprecate(
			(compilation) => {
				if(compilation.errors.length > 0)
					return false;
			},
			"webpack: Using NoErrorsPlugin is deprecated.\n" +
			"Use NoEmitOnErrorsPlugin instead.\n"
		));
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("should-record", () => {
				if(compilation.errors.length > 0)
					return false;
			});
		});
	}
}

module.exports = NoErrorsPlugin;
