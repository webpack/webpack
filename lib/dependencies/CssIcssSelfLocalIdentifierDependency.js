/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const Dependency = require("../Dependency");
const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const CssLocalIdentifierDependency = require("./CssIcssLocalIdentifierDependency");

/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../css/CssGenerator")} CssGenerator */

class CssIcssSelfLocalIdentifierDependency extends CssLocalIdentifierDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} exportName export name
	 * @param {string=} prefix prefix
	 * @param {Set<string>=} declaredSet set of declared names (will only be active when in declared set)
	 */
	constructor(name, range, exportName, prefix = "", declaredSet = undefined) {
		super(name, range, prefix);
		this.declaredSet = declaredSet;
		this.exportName = exportName;
	}

	get type() {
		return "css self local identifier";
	}

	get category() {
		return "self";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return "self";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		if (
			(this.declaredSet && !this.declaredSet.has(this.name)) ||
			this.exportName
		) {
			return;
		}
		return super.getExports(moduleGraph);
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (this.declaredSet && !this.declaredSet.has(this.name)) {
			return Dependency.NO_EXPORTS_REFERENCED;
		}
		return [
			{
				name: [this.name],
				canMangle: true
			}
		];
	}

	/**
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		if (this.exportName) {
			const module = moduleGraph.getModule(this);

			if (
				module &&
				!moduleGraph.getExportsInfo(module).isExportProvided(this.name)
			) {
				const error = new WebpackError(
					`Self-referencing name "${this.name}" not found`
				);
				error.module = module;

				return [error];
			}
		}

		return null;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.declaredSet);
		write(this.exportName);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.declaredSet = read();
		this.exportName = read();
		super.deserialize(context);
	}
}

CssIcssSelfLocalIdentifierDependency.Template = class CssSelfLocalIdentifierDependencyTemplate extends (
	CssLocalIdentifierDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep =
			/** @type {CssIcssSelfLocalIdentifierDependency} */
			(dependency);
		if (dep.declaredSet && !dep.declaredSet.has(dep.name)) return;
		if (dep.exportName) {
			const { module: m, moduleGraph, runtime, cssData } = templateContext;
			const module = /** @type {CssModule} */ (m);

			if (!moduleGraph.getExportsInfo(module).isExportProvided(dep.name)) {
				return;
			}

			const generator = /** @type {CssGenerator} */ (module.generator);
			const exportNames = cssExportConvention(
				dep.exportName,
				/** @type {CssGeneratorExportsConvention} */
				(generator.convention)
			);
			const exportUsedNames =
				/** @type {string[]} */
				(
					exportNames
						.map((name) =>
							moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
						)
						.filter(Boolean)
				);

			for (const used of new Set([...exportNames, ...exportUsedNames])) {
				const originalValue = cssData.exports.get(used);
				const inheritance = cssData.exports.get(dep.name);

				cssData.exports.set(
					used,
					`${originalValue ? `${originalValue}` : ""}${inheritance ? ` ${inheritance}` : ""}`
				);
			}
			return;
		}
		super.apply(dependency, source, templateContext);
	}
};

makeSerializable(
	CssIcssSelfLocalIdentifierDependency,
	"webpack/lib/dependencies/CssIcssSelfLocalIdentifierDependency"
);

module.exports = CssIcssSelfLocalIdentifierDependency;
