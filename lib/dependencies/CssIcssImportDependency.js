/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");
const CssImportDependency = require("./CssImportDependency");
const CssLocalIdentifierDependency = require("./CssLocalIdentifierDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class CssIcssImportDependency extends CssImportDependency {
	/**
	 * Example of dependency:
	 *
	 *:import('./style.css') { IMPORTED_NAME: v-primary }
	 * @param {string} request request request path which needs resolving
	 * @param {Range} range the range of dependency
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} exportName export name
	 */
	constructor(request, range, mode, exportName) {
		super(request, range, mode);
		this.exportName = exportName;
	}

	get type() {
		return "css :import";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.exportName);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.exportName = read();
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
		const { range } = dep;
		const module =
			/** @type {Module} */
			(templateContext.moduleGraph.getModule(dep));
		let value;

		if (module) {
			for (const item of module.dependencies) {
				if (
					item instanceof CssLocalIdentifierDependency &&
					dep.exportName === item.name
				) {
					value = CssLocalIdentifierDependency.Template.getIdentifier(
						item.prefix,
						dep.exportName,
						{
							...templateContext,
							module
						}
					);
					break;
				} else if (
					item instanceof CssIcssExportDependency &&
					dep.exportName === item.name
				) {
					value = item.value;
					break;
				}
			}

			if (!value) {
				throw new Error(
					`Imported '${dep.exportName}' name from '${dep.request}' not found`
				);
			}

			source.replace(range[0], range[1], value);
		}
	}
};

makeSerializable(
	CssIcssImportDependency,
	"webpack/lib/dependencies/CssIcssImportDependency"
);

module.exports = CssIcssImportDependency;
