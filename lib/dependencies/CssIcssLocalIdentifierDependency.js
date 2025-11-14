/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssIcssExportDependency = require("./CssIcssExportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const getCssParser = memoize(() => require("../css/CssParser"));

class CssIcssLocalIdentifierDependency extends CssIcssExportDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super(name, true);
		this.range = range;
		this.prefix = prefix;
	}

	get type() {
		return "css local identifier";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.prefix = read();
		super.deserialize(context);
	}
}

CssIcssLocalIdentifierDependency.Template = class CssLocalIdentifierDependencyTemplate extends (
	CssIcssExportDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { cssData } = templateContext;
		const dep = /** @type {CssIcssLocalIdentifierDependency} */ (dependency);
		const names = CssLocalIdentifierDependencyTemplate.getNames(
			dep,
			templateContext
		);
		const identifier = /** @type {string} */ (
			CssLocalIdentifierDependencyTemplate.getIdentifier(dep, templateContext)
		);

		if (templateContext.type === "javascript") {
			for (const used of names) {
				if (cssData.exports.has(used)) return;
				cssData.exports.set(
					used,
					getCssParser().unescapeIdentifier(identifier)
				);
			}
		} else if (templateContext.type === "css") {
			source.replace(dep.range[0], dep.range[1] - 1, identifier);
		}
	}
};

makeSerializable(
	CssIcssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssIcssLocalIdentifierDependency;
