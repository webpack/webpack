/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("./Template");

class FunctionModuleTemplatePlugin {
	apply(moduleTemplate) {
		moduleTemplate.plugin("render", (moduleSource, module) => {
			const source = new ConcatSource();
			const args = [module.moduleArgument];
			// TODO remove HACK checking type for javascript
			if(module.type && module.type.startsWith("javascript")) {
				args.push(module.exportsArgument);
				if(module.hasDependencies(d => d.requireWebpackRequire !== false)) {
					args.push("__webpack_require__");
				}
			} else if(module.type && module.type.startsWith("json")) {
				// no additional arguments needed
			} else {
				args.push(module.exportsArgument, "__webpack_require__");
			}
			source.add("/***/ (function(" + args.join(", ") + ") {\n\n");
			if(module.strict) source.add("\"use strict\";\n");
			source.add(moduleSource);
			source.add("\n\n/***/ })");
			return source;
		});

		moduleTemplate.plugin("package", (moduleSource, module) => {
			if(moduleTemplate.outputOptions.pathinfo) {
				const source = new ConcatSource();
				const req = module.readableIdentifier(moduleTemplate.requestShortener);
				source.add("/*!****" + req.replace(/./g, "*") + "****!*\\\n");
				source.add("  !*** " + req.replace(/\*\//g, "*_/") + " ***!\n");
				source.add("  \\****" + req.replace(/./g, "*") + "****/\n");
				if(Array.isArray(module.providedExports) && module.providedExports.length === 0)
					source.add(Template.toComment("no exports provided") + "\n");
				else if(Array.isArray(module.providedExports))
					source.add(Template.toComment("exports provided: " + module.providedExports.join(", ")) + "\n");
				else if(module.providedExports)
					source.add(Template.toComment("no static exports found") + "\n");
				if(Array.isArray(module.usedExports) && module.usedExports.length === 0)
					source.add(Template.toComment("no exports used") + "\n");
				else if(Array.isArray(module.usedExports))
					source.add(Template.toComment("exports used: " + module.usedExports.join(", ")) + "\n");
				else if(module.usedExports)
					source.add(Template.toComment("all exports used") + "\n");
				if(module.optimizationBailout) {
					module.optimizationBailout.forEach(text => {
						if(typeof text === "function") text = text(moduleTemplate.requestShortener);
						source.add(Template.toComment(`${text}`) + "\n");
					});
				}
				source.add(moduleSource);
				return source;
			}
			return moduleSource;
		});

		moduleTemplate.plugin("hash", hash => {
			hash.update("FunctionModuleTemplatePlugin");
			hash.update("2");
		});
	}
}
module.exports = FunctionModuleTemplatePlugin;
