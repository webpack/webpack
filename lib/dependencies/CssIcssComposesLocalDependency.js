/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

const getCssParser = memoize(() => require("../css/CssParser"));
const getCssIcssLocalIdentifierDependency = memoize(() =>
	require("./CssIcssLocalIdentifierDependency")
);

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

class CssIcssComposesLocalDependency extends ModuleDependency {
	/**
	 * @param {string} request request request path which needs resolving
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} name imported class name
	 * @param {string} exportName export class name
	 * @param {Range} range the range of dependency
	 */
	constructor(request, mode, name, exportName, range) {
		super(request);
		this.mode = mode;
		this.name = name;
		this.exportName = exportName;
		this.range = range;
	}

	get type() {
		return "css composes local";
	}

	get category() {
		return `css-import-${this.mode}-module`;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `${super.getResourceIdentifier()}|mode${this.mode}|className${this.name}|exportName${this.exportName}`;
	}

	/**
	 * @param {string} name export name
	 * @param {CssGeneratorExportsConvention} convention convention of the export name
	 * @returns {string[]} convention results
	 */
	getExportsConventionNames(name, convention) {
		if (this._conventionNames) {
			return this._conventionNames;
		}
		this._conventionNames = cssExportConvention(name, convention);
		return this._conventionNames;
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
		const module = moduleGraph.getModule(this);

		if (
			module &&
			!moduleGraph.getExportsInfo(module).isExportProvided(this.name)
		) {
			const error = new WebpackError(
				`Referenced class name "${this.name}" in composes not found`
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
		write(this.mode);
		write(this.name);
		write(this.exportName);
		write(this.range);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.mode = read();
		this.name = read();
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
		if (templateContext.type !== "javascript") return;
		const { moduleGraph, runtime, cssData } = templateContext;
		const dep = /** @type {CssIcssComposesLocalDependency} */ (dependency);
		const module =
			/** @type {CssModule} */
			(moduleGraph.getModule(dep));

		if (!moduleGraph.getExportsInfo(module).isExportProvided(dep.name)) {
			return;
		}

		const generator = /** @type {CssGenerator} */ (module.generator);
		const identifier =
			/** @type {string} */
			(
				getCssIcssLocalIdentifierDependency().Template.getIdentifier(dep, {
					...templateContext,
					module
				})
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
