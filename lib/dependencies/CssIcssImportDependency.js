/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssImportDependency = require("./CssImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("./CssIcssExportDependency").ExportMode} ExportMode */
/** @typedef {import("./CssIcssExportDependency").ExportType} ExportType */

const getCssIcssExportDependency = memoize(() =>
	require("./CssIcssExportDependency")
);

class CssIcssImportDependency extends CssImportDependency {
	/**
	 * Example of dependency:
	 *
	 * :import('./style.css') { value: name }
	 * @param {string} request request request path which needs resolving
	 * @param {Range} range the range of dependency
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} name name
	 * @param {string=} exportName export value
	 * @param {ExportMode=} exportMode export mode
	 * @param {ExportType=} exportType export type
	 */
	constructor(
		request,
		range,
		mode,
		name,
		exportName = undefined,
		exportMode = getCssIcssExportDependency().EXPORT_MODE.NONE,
		exportType = getCssIcssExportDependency().EXPORT_TYPE.NORMAL
	) {
		super(request, range, mode);
		this.name = name;
		this.value = exportName;
		this.interpolate = true;
		this.exportMode = exportMode;
		this.exportType = exportType;
	}

	get type() {
		return "css :import";
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return `${super.getResourceIdentifier()}|mode${this.mode}|name${this.name}`;
	}

	/**
	 * @param {string} name export name
	 * @param {CssGeneratorExportsConvention} convention convention of the export name
	 * @returns {string[]} convention results
	 */
	getExportsConventionNames(name, convention) {
		return cssExportConvention(name, convention);
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
				`Referenced name "${this.name}" in "${this.userRequest}" not found`
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
		write(this.name);
		write(this.value);
		write(this.interpolate);
		write(this.exportMode);
		write(this.exportType);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.value = read();
		this.interpolate = read();
		this.exportMode = read();
		this.exportType = read();
		super.deserialize(context);
	}
}

CssIcssImportDependency.Template = class CssIcssImportDependencyTemplate extends (
	CssImportDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {CssIcssImportDependency} */ (dependency);

		if (dep.value) {
			const { moduleGraph } = templateContext;
			const module =
				/** @type {CssModule} */
				(moduleGraph.getModule(dep));
			const CssIcssExportDependency = getCssIcssExportDependency();
			const template = new CssIcssExportDependency.Template();
			const originalName = dep.name;
			const originalExportName = dep.value;
			dep.value = originalName;
			dep.name = originalExportName;
			template.apply(dep, source, { ...templateContext, module });
			dep.name = originalName;
			dep.value = originalExportName;
		}
	}
};

makeSerializable(
	CssIcssImportDependency,
	"webpack/lib/dependencies/CssIcssImportDependency"
);

module.exports = CssIcssImportDependency;
