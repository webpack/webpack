/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");
const CssIcssImportDependency = require("./CssIcssImportDependency");
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

class CssIcssFromIdentifierDependency extends CssIcssImportDependency {
	/**
	 * @param {string} request request request path which needs resolving
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {Range} range the range of dependency
	 * @param {string} name import class name
	 * @param {string} exportName export class name
	 * @param {string=} prefix prefix
	 */
	constructor(request, mode, range, name, exportName, prefix) {
		super(request, range, mode, name);
		this.exportName = exportName;
		this.value = name;
		this.prefix = prefix;
		this.interpolationMode = CssIcssExportDependency.INTERPOLATION_MODE.VALUE;
		this.exportMode = CssIcssExportDependency.EXPORT_MODE.APPEND;
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
		return cssExportConvention(name, convention);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.exportName);
		write(this.prefix);
		write(this.interpolationMode);
		write(this.exportMode);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.exportName = read();
		this.prefix = read();
		this.interpolationMode = read();
		this.exportMode = read();
		super.deserialize(context);
	}
}

CssIcssFromIdentifierDependency.Template = class CssIcssFromIdentifierDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { moduleGraph } = templateContext;
		const dep = /** @type {CssIcssFromIdentifierDependency} */ (dependency);
		const module =
			/** @type {CssModule} */
			(moduleGraph.getModule(dep));

		if (!moduleGraph.getExportsInfo(module).isExportProvided(dep.name)) {
			return;
		}

		const template = new CssIcssExportDependency.Template();
		const originalName = dep.name;
		dep.name = dep.exportName;
		template.apply(dep, source, { ...templateContext, module });
		dep.name = originalName;
	}
};

makeSerializable(
	CssIcssFromIdentifierDependency,
	"webpack/lib/dependencies/CssIcssFromIdentifierDependency"
);

module.exports = CssIcssFromIdentifierDependency;
