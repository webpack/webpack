/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class FunctionModuleTemplatePlugin {
	apply(moduleTemplate) {
		moduleTemplate.plugin("render", function(moduleSource, module) {
			const source = new ConcatSource();
			const defaultArguments = [module.moduleArgument || "module", module.exportsArgument || "exports"];
			if((module.arguments && module.arguments.length !== 0) || module.hasDependencies(d => d.requireWebpackRequire !== false)) {
				defaultArguments.push("__webpack_require__");
			}
			source.add("/***/ (function(" + defaultArguments.concat(module.arguments || []).join(", ") + ") {\n\n");
			if(module.strict) source.add("\"use strict\";\n");
			source.add(moduleSource);
			source.add("\n\n/***/ })");
			return source;
		});

		moduleTemplate.plugin("package", function(moduleSource, module) {
			if(this.outputOptions.pathinfo) {
				const source = new ConcatSource();
				const req = module.readableIdentifier(this.requestShortener);
				source.add("/*!****" + req.replace(/./g, "*") + "****!*\\\n");
				source.add("  !*** " + req.replace(/\*\//g, "*_/") + " ***!\n");
				source.add("  \\****" + req.replace(/./g, "*") + "****/\n");
				if(Array.isArray(module.providedExports) && module.providedExports.length === 0)
					source.add("/*! no exports provided */\n");
				else if(Array.isArray(module.providedExports))
					source.add("/*! exports provided: " + module.providedExports.join(", ") + " */\n");
				else if(module.providedExports)
					source.add("/*! dynamic exports provided */\n");
				if(Array.isArray(module.usedExports) && module.usedExports.length === 0)
					source.add("/*! no exports used */\n");
				else if(Array.isArray(module.usedExports))
					source.add("/*! exports used: " + module.usedExports.join(", ") + " */\n");
				else if(module.usedExports)
					source.add("/*! all exports used */\n");
				if(module.optimizationBailout) {
					module.optimizationBailout.forEach(text => {
						if(typeof text === "function") text = text(this.requestShortener);
						source.add(`/*! ${text} */\n`);
					});
				}
				source.add(moduleSource);
				return source;
			}
			return moduleSource;
		});

		moduleTemplate.plugin("hash", function(hash) {
			hash.update("FunctionModuleTemplatePlugin");
			hash.update("2");
		});
	}
}
module.exports = FunctionModuleTemplatePlugin;
