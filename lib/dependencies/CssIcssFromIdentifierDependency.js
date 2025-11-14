/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssImportDependency = require("./CssImportDependency");
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

class CssIcssFromIdentifierDependency extends CssImportDependency {
	/**
	 * @param {string} request request request path which needs resolving
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {Range} range the range of dependency
	 * @param {string} name imported class name
	 * @param {string} exportName export class name
	 * @param {string=} prefix prefix
	 */
	constructor(request, mode, range, name, exportName, prefix) {
		super(request, range, mode);
		this.mode = mode;
		this.name = name;
		this.exportName = exportName;
		this.range = range;
		this.prefix = prefix;
	}

	get type() {
		return "css from identifier";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `${super.getResourceIdentifier()}|exportName${this.exportName}|prefix${this.prefix}`;
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
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.mode);
		write(this.name);
		write(this.exportName);
		write(this.range);
		write(this.prefix);
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
		this.prefix = read();
		super.deserialize(context);
	}
}

CssIcssFromIdentifierDependency.Template = class CssIcssComposesDependencyTemplate extends (
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
		const dep = /** @type {CssIcssFromIdentifierDependency} */ (dependency);
		const module =
			/** @type {CssModule} */
			(moduleGraph.getModule(dep));

		if (!moduleGraph.getExportsInfo(module).isExportProvided(dep.name)) {
			return;
		}

		const generator = /** @type {CssGenerator} */ (module.generator);
		const identifier = getCssParser().unescapeIdentifier(
			/** @type {string} */
			(
				getCssIcssLocalIdentifierDependency().Template.getIdentifier(dep, {
					...templateContext,
					module
				})
			)
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

		if (templateContext.type === "javascript") {
			for (const used of new Set([...exportNames, ...exportUsedNames])) {
				const originalValue = cssData.exports.get(used);

				cssData.exports.set(
					used,
					`${originalValue ? `${originalValue} ` : ""}${identifier}`
				);
			}
		} else if (templateContext.type === "css") {
			if (dep.name !== dep.exportName) return;
			source.replace(dep.range[0], dep.range[1] - 1, `${identifier}`);
		}
	}
};

makeSerializable(
	CssIcssFromIdentifierDependency,
	"webpack/lib/dependencies/CssIcssFromIdentifierDependency"
);

module.exports = CssIcssFromIdentifierDependency;
