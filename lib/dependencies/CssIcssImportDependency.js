/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../css/CssParser").ImportMap} ImportMap */

class CssIcssImportDependency extends ModuleDependency {
	/**
	 * Example of dependency:
	 *
	 *:import('./style.css') { IMPORTED_NAME: v-primary }
	 * @param {string} request the request of dependency
	 * @param {[number, number]} range the range of dependency
	 * @param {ImportMap} importMap collected import data of dependency
	 */
	constructor(request, range, importMap) {
		super(request);
		this.range = range;
		this.importMap = importMap;
	}

	get type() {
		return "css :import";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.importMap);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.importMap = read();
		super.deserialize(context);
	}

	/**
	 * @param {string} id the id of the module
	 * @param {string} value the value of the import
	 * @returns {string} the replacement string
	 */
	static generateReplacementStr(id, value) {
		return `__webpack_icss_import_${id}_${value}__`;
	}
}

CssIcssImportDependency.Template = class CssIcssImportDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {CssIcssImportDependency} */ (dependency);
		const { range, importMap } = dep;

		const resolvedModule =
			templateContext.chunkGraph.moduleGraph.getResolvedModule(dep);
		let moduleId = templateContext.chunkGraph.getModuleId(resolvedModule);
		if (typeof moduleId === "string") {
			moduleId = moduleId.replace(/\\/g, "/");
		}
		for (const [importName, value] of importMap.entries()) {
			for (const replaceRange of value.replaceRanges) {
				source.replace(
					replaceRange[0],
					replaceRange[1],
					CssIcssImportDependency.generateReplacementStr(
						String(moduleId),
						importMap.get(importName).importValue
					)
				);
			}
			templateContext.cssIcssImportData[importName] = {
				module: resolvedModule,
				importValue: importMap.get(importName).importValue
			};
		}
		source.replace(range[0], range[1], "");
	}
};

makeSerializable(
	CssIcssImportDependency,
	"webpack/lib/dependencies/CssIcssImportDependency"
);

module.exports = CssIcssImportDependency;
