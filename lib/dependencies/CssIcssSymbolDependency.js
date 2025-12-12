/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { CSS_TYPE } = require("../ModuleSourceTypeConstants");
const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CssIcssSymbolDependency extends NullDependency {
	/**
	 * @param {string} name name
	 * @param {string} symbol symbol
	 * @param {Range} range range
	 * @param {boolean=} isReference true when is reference, otherwise false
	 */
	constructor(name, symbol, range, isReference) {
		super();
		this.name = name;
		this.symbol = symbol;
		this.range = range;
		this.isReference = isReference;
		this._hashUpdate = undefined;
	}

	get type() {
		return "css symbol identifier";
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			this._hashUpdate = `${this.range}${this.name}${this.value}`;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return [[this.symbol]];
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.name);
		write(this.symbol);
		write(this.value);
		write(this.range);
		write(this.isReference);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.symbol = read();
		this.value = read();
		this.range = read();
		this.isReference = read();
		super.deserialize(context);
	}
}

CssIcssSymbolDependency.Template = class CssIcssSymbolDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type === CSS_TYPE) {
			const dep = /** @type {CssIcssSymbolDependency} */ (dependency);
			/** @type {string | undefined} */
			const value = dep.isReference
				? CssIcssExportDependency.Template.findReference(
						dep.symbol,
						templateContext
					)
				: dep.symbol;

			if (!value) {
				return;
			}

			source.replace(dep.range[0], dep.range[1] - 1, value);
		}
	}
};

makeSerializable(
	CssIcssSymbolDependency,
	"webpack/lib/dependencies/CssIcssSymbolDependency"
);

module.exports = CssIcssSymbolDependency;
