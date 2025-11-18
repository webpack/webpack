/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("../WebpackError");
const makeSerializable = require("../util/makeSerializable");
const CssImportDependency = require("./CssImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */

class CssIcssImportDependency extends CssImportDependency {
	/**
	 * Example of dependency:
	 *
	 * :import('./style.css') { IMPORTED_NAME: v-primary }
	 * @param {string} request request request path which needs resolving
	 * @param {Range} range the range of dependency
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} name importName name
	 */
	constructor(request, range, mode, name) {
		super(request, range, mode);
		this.name = name;
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
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
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
		// We remove everything in CSS parser
	}
};

makeSerializable(
	CssIcssImportDependency,
	"webpack/lib/dependencies/CssIcssImportDependency"
);

module.exports = CssIcssImportDependency;
