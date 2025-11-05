/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssLocalIdentifierDependency = require("./CssLocalIdentifierDependency");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const getCssParser = memoize(() => require("../css/CssParser"));

class CssIcssComposesLocalDependency extends ModuleDependency {
	/**
	 * @param {string} request request request path which needs resolving
	 * @param {string} className imported class name
	 * @param {string} exportName export class name
	 * @param {Range} range the range of dependency
	 */
	constructor(request, className, exportName, range) {
		super(request);
		this.className = className;
		this.exportName = exportName;
		this.range = range;
	}

	get type() {
		return "css composes local";
	}

	get category() {
		return "css-import";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `${super.getResourceIdentifier()}|className${this.className}|exportName${this.exportName}`;
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
				`Referenced class name "${this.className}" in composes not found`
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

CssIcssComposesLocalDependency.Template = class CssIcssComposesDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph, runtime, cssData } = templateContext;
		const dep = /** @type {CssIcssComposesLocalDependency} */ (dependency);
		const module =
			/** @type {CssModule} */
			(moduleGraph.getModule(dep));

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
			{
				...templateContext,
				module
			}
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
						moduleGraph
							.getExportInfo(templateContext.module, name)
							.getUsedName(name, runtime)
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
	CssIcssComposesLocalDependency,
	"webpack/lib/dependencies/CssIcssComposesLocalDependency"
);

module.exports = CssIcssComposesLocalDependency;
