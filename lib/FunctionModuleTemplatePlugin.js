/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");

/** @typedef {import("./ModuleTemplate")} ModuleTemplate */

class FunctionModuleTemplatePlugin {
	constructor({ compilation }) {
		this.compilation = compilation;
	}

	/**
	 * @param {ModuleTemplate} moduleTemplate a module template
	 * @returns {void}
	 */
	apply(moduleTemplate) {
		moduleTemplate.hooks.render.tap(
			"FunctionModuleTemplatePlugin",
			(moduleSource, module) => {
				const { chunkGraph } = this.compilation;
				const source = new ConcatSource();
				const args = [];
				const runtimeRequirements = chunkGraph.getModuleRuntimeRequirements(
					module
				);
				const needModule = runtimeRequirements.has(RuntimeGlobals.module);
				const needExports = runtimeRequirements.has(RuntimeGlobals.exports);
				const needRequire = runtimeRequirements.has(RuntimeGlobals.require);
				if (needExports || needRequire || needModule)
					args.push(
						needModule
							? module.moduleArgument
							: "__unused" + module.moduleArgument
					);
				if (needExports || needRequire)
					args.push(
						needExports
							? module.exportsArgument
							: "__unused" + module.exportsArgument
					);
				if (needRequire) args.push("__webpack_require__");
				source.add("/***/ (function(" + args.join(", ") + ") {\n\n");
				if (module.buildInfo.strict) source.add('"use strict";\n');
				source.add(moduleSource);
				source.add("\n\n/***/ })");
				return source;
			}
		);

		moduleTemplate.hooks.package.tap(
			"FunctionModuleTemplatePlugin",
			(moduleSource, module, { moduleGraph, chunkGraph }) => {
				if (moduleTemplate.runtimeTemplate.outputOptions.pathinfo) {
					const source = new ConcatSource();
					const req = module.readableIdentifier(
						moduleTemplate.runtimeTemplate.requestShortener
					);
					source.add("/*!****" + req.replace(/./g, "*") + "****!*\\\n");
					source.add("  !*** " + req.replace(/\*\//g, "*_/") + " ***!\n");
					source.add("  \\****" + req.replace(/./g, "*") + "****/\n");
					if (
						Array.isArray(module.buildMeta.providedExports) &&
						module.buildMeta.providedExports.length === 0
					) {
						source.add(Template.toComment("no exports provided") + "\n");
					} else if (Array.isArray(module.buildMeta.providedExports)) {
						source.add(
							Template.toComment(
								"exports provided: " +
									module.buildMeta.providedExports.join(", ")
							) + "\n"
						);
					} else if (module.buildMeta.providedExports) {
						source.add(Template.toComment("no static exports found") + "\n");
					}
					source.add(
						Template.toComment(
							`runtime requirements: ${Array.from(
								chunkGraph.getModuleRuntimeRequirements(module)
							).join(", ")}`
						) + "\n"
					);
					const usedExports = moduleGraph.getUsedExports(module);
					if (usedExports === true) {
						source.add(Template.toComment("all exports used") + "\n");
					} else if (usedExports === false) {
						source.add(Template.toComment("module unused") + "\n");
					} else if (usedExports) {
						if (usedExports.size === 0) {
							source.add(Template.toComment("no exports used") + "\n");
						} else {
							source.add(
								Template.toComment(
									"exports used: " + Array.from(usedExports).join(", ")
								) + "\n"
							);
						}
					}
					const optimizationBailout = moduleGraph.getOptimizationBailout(
						module
					);
					if (optimizationBailout) {
						for (const text of optimizationBailout) {
							let code;
							if (typeof text === "function") {
								code = text(moduleTemplate.runtimeTemplate.requestShortener);
							} else {
								code = text;
							}
							source.add(Template.toComment(`${code}`) + "\n");
						}
					}
					source.add(moduleSource);
					return source;
				}
				return moduleSource;
			}
		);

		moduleTemplate.hooks.hash.tap("FunctionModuleTemplatePlugin", hash => {
			hash.update("FunctionModuleTemplatePlugin");
			hash.update("2");
		});
	}
}
module.exports = FunctionModuleTemplatePlugin;
