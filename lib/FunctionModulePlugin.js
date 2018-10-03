/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const FunctionModuleTemplatePlugin = require("./FunctionModuleTemplatePlugin");

class FunctionModulePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("FunctionModulePlugin", compilation => {
			new FunctionModuleTemplatePlugin({
				moduleGraph: compilation.moduleGraph
			}).apply(compilation.moduleTemplates.javascript);
		});
	}
}

module.exports = FunctionModulePlugin;
