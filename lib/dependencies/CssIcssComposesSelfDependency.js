/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssLocalIdentifierDependency = require("./CssLocalIdentifierDependency");
const NullDependency = require("./NullDependency");

const getCssParser = memoize(() => require("../css/CssParser"));

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CssIcssComposesSelfDependency extends NullDependency {
	/**
	 * @param {string} className name
	 * @param {string} exportName export name
	 * @param {Range} range range
	 */
	constructor(className, exportName, range) {
		super();
		this.className = className;
		this.exportName = exportName;
		this.range = range;
	}

	get type() {
		return "css composes self";
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
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return [
			{
				name: [this.className],
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
		const module = moduleGraph.getModule(this);

		if (
			module &&
			!moduleGraph.getExportsInfo(module).isExportProvided(this.className)
		) {
			const error = new WebpackError(
				`Self-referencing class name "${this.className}" in composes not found`
			);
			error.module = module;

			return [error];
		}

		return null;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.className);
		write(this.exportName);
		write(this.range);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.className = read();
		this.exportName = read();
		this.range = read();
		super.deserialize(context);
	}
}

CssIcssComposesSelfDependency.Template = class CssIcssComposesSelfDependencyTemplate extends (
	CssLocalIdentifierDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { module: m, moduleGraph, runtime, cssData } = templateContext;
		const dep = /** @type {CssIcssComposesSelfDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);

		if (!moduleGraph.getExportsInfo(module).isExportProvided(dep.className)) {
			return;
		}

		const generator = /** @type {CssGenerator} */ (module.generator);

		const names = cssExportConvention(
			dep.className,
			/** @type {CssGeneratorExportsConvention} */
			(generator.convention)
		);
		const usedNames =
			/** @type {string[]} */
			(
				names
					.map((name) =>
						moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
					)
					.filter(Boolean)
			);
		const local = usedNames.length === 0 ? names[0] : usedNames[0];
		const identifier = CssLocalIdentifierDependency.Template.getIdentifier(
			"",
			local,
			templateContext
		);

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

			cssData.exports.set(
				used,
				`${originalValue ? `${originalValue} ` : ""}${getCssParser().unescapeIdentifier(identifier)}`
			);
		}
	}
};

makeSerializable(
	CssIcssComposesSelfDependency,
	"webpack/lib/dependencies/CssIcssComposesSelfDependency"
);

module.exports = CssIcssComposesSelfDependency;
