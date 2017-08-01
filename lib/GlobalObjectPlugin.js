/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class GlobalObjectPlugin {
	constructor(global) {
		this.global = global;
	}

	apply(compiler) {
		const global = this.global;
		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
				parser.plugin("global", function() {
					return global;
				});
			});
		});
	}
}
module.exports = GlobalObjectPlugin;
