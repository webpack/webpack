/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("./ExportsInfo");
const Template = require("./Template");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ExportsInfo")} ExportsInfo */
/** @typedef {import("./ExportsInfo").ExportInfo} ExportInfo */
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

/**
 * @param {ConcatSource} source output
 * @param {string} indent spacing
 * @param {ExportsInfo} exportsInfo data
 * @param {Set<ExportInfo>} alreadyPrinted deduplication set
 * @returns {void}
 */
const printExportsInfoToSource = (
	source,
	indent,
	exportsInfo,
	alreadyPrinted = new Set()
) => {
	const otherExportsInfo = exportsInfo.otherExportsInfo;

	let alreadyPrintedExports = 0;

	// determine exports to print
	const printedExports = [];
	for (const exportInfo of exportsInfo.orderedExports) {
		if (!alreadyPrinted.has(exportInfo)) {
			alreadyPrinted.add(exportInfo);
			printedExports.push(exportInfo);
		} else {
			alreadyPrintedExports++;
		}
	}
	let showOtherExports = false;
	if (!alreadyPrinted.has(otherExportsInfo)) {
		alreadyPrinted.add(otherExportsInfo);
		showOtherExports = true;
	} else {
		alreadyPrintedExports++;
	}

	// print the exports
	for (const exportInfo of printedExports) {
		source.add(
			Template.toComment(
				`${indent}export ${JSON.stringify(exportInfo.name).slice(
					1,
					-1
				)} [${exportInfo.getProvidedInfo()}] [${exportInfo.getUsedInfo()}] [${exportInfo.getRenameInfo()}]`
			) + "\n"
		);
		if (exportInfo.exportsInfo) {
			printExportsInfoToSource(
				source,
				indent + "  ",
				exportInfo.exportsInfo,
				alreadyPrinted
			);
		}
	}

	if (alreadyPrintedExports) {
		source.add(
			Template.toComment(
				`${indent}... (${alreadyPrintedExports} already listed exports)`
			) + "\n"
		);
	}

	if (showOtherExports) {
		if (
			otherExportsInfo.provided !== false ||
			otherExportsInfo.getUsed(undefined) !== UsageState.Unused
		) {
			const title =
				printedExports.length > 0 || alreadyPrintedExports > 0
					? "other exports"
					: "exports";
			source.add(
				Template.toComment(
					`${indent}${title} [${otherExportsInfo.getProvidedInfo()}] [${otherExportsInfo.getUsedInfo()}]`
				) + "\n"
			);
		}
	}
};

class ModuleInfoHeaderPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("ModuleInfoHeaderPlugin", compilation => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
			hooks.renderModulePackage.tap(
				"ModuleInfoHeaderPlugin",
				(
					moduleSource,
					module,
					{ chunk, chunkGraph, moduleGraph, runtimeTemplate }
				) => {
					const source = new ConcatSource();
					const req = module.readableIdentifier(
						runtimeTemplate.requestShortener
					);
					const reqStr = req.replace(/\*\//g, "*_/");
					const reqStrStar = "*".repeat(reqStr.length);
					source.add("/*!****" + reqStrStar + "****!*\\\n");
					source.add("  !*** " + reqStr + " ***!\n");
					source.add("  \\****" + reqStrStar + "****/\n");
					const exportsType = module.buildMeta.exportsType;
					source.add(
						Template.toComment(
							exportsType
								? `${exportsType} exports`
								: "unknown exports (runtime-defined)"
						) + "\n"
					);
					if (exportsType) {
						const exportsInfo = moduleGraph.getExportsInfo(module);
						printExportsInfoToSource(source, "", exportsInfo);
					}
					source.add(
						Template.toComment(
							`runtime requirements: ${joinIterableWithComma(
								chunkGraph.getModuleRuntimeRequirements(module, chunk.runtime)
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
								code = text(runtimeTemplate.requestShortener);
							} else {
								code = text;
							}
							source.add(Template.toComment(`${code}`) + "\n");
						}
					}
					source.add(moduleSource);
					return source;
				}
			);
			hooks.chunkHash.tap("ModuleInfoHeaderPlugin", (chunk, hash) => {
				hash.update("ModuleInfoHeaderPlugin");
				hash.update("1");
			});
		});
	}
}
module.exports = ModuleInfoHeaderPlugin;
