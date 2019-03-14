/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");

/** @typedef {import("./ModuleTemplate")} ModuleTemplate */

const joinIterableWithComma = iterable => {
	// This is more performant than Array.from().join(", ")
	// as it doesn't create an array
	let str = "";
	let first = true;
	for (const item of iterable) {
		if (first) {
			first = false;
		} else {
			str += ", ";
		}
		str += item;
	}
	return str;
};

const printExportsInfoToSource = (source, indent, exportsInfo) => {
	let hasExports = false;
	for (const exportInfo of exportsInfo.orderedExports) {
		source.add(
			Template.toComment(
				`${indent}export ${
					exportInfo.name
				} [${exportInfo.getProvidedInfo()}] [${exportInfo.getUsedInfo()}] [${exportInfo.getRenameInfo()}]`
			) + "\n"
		);
		if (exportInfo.exportsInfo) {
			printExportsInfoToSource(source, indent + "  ", exportInfo.exportsInfo);
		}
		hasExports = true;
	}
	const otherExportsInfo = exportsInfo.otherExportsInfo;
	if (otherExportsInfo.provided !== false || otherExportsInfo.used !== false) {
		const title = hasExports ? "other exports" : "exports";
		source.add(
			Template.toComment(
				`${indent}${title} [${otherExportsInfo.getProvidedInfo()}] [${otherExportsInfo.getUsedInfo()}]`
			) + "\n"
		);
	}
};

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
					const reqStr = req.replace(/\*\//g, "*_/");
					const reqStrStar = "*".repeat(reqStr.length);
					source.add("/*!****" + reqStrStar + "****!*\\\n");
					source.add("  !*** " + reqStr + " ***!\n");
					source.add("  \\****" + reqStrStar + "****/\n");
					const exportsInfo = moduleGraph.getExportsInfo(module);
					printExportsInfoToSource(source, "", exportsInfo);
					source.add(
						Template.toComment(
							`runtime requirements: ${joinIterableWithComma(
								chunkGraph.getModuleRuntimeRequirements(module)
							)}`
						) + "\n"
					);
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
