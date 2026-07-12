/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

import { CSS_TYPE } from "../ModuleSourceTypeConstants.js";
import makeSerializable from "../util/makeSerializable.js";
import CssIcssExportDependency from "./CssIcssExportDependency.js";
import NullDependency from "./NullDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Dependency.js").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency.js").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency.js").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate.js").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../css/CssParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string, Range, string | undefined, string | undefined, string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[string, Range, string | undefined, string | undefined, string | undefined]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash.js").default} Hash */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */

class CssIcssSymbolDependency extends NullDependency {
	/**
	 * Creates an instance of CssIcssSymbolDependency.
	 * @param {string} localName local name
	 * @param {Range} range range
	 * @param {string=} value value when it was defined in this module
	 * @param {string=} importName import name when it was imported from other module
	 * @param {string=} request request of the `@value` import that was active when this reference was parsed — used to disambiguate when the same local name is imported from multiple modules
	 */
	constructor(localName, range, value, importName, request) {
		super();
		/** @type {string} */
		this.localName = localName;
		this.range = range;
		/** @type {string | undefined} */
		this.value = value;
		/** @type {string | undefined} */
		this.importName = importName;
		/** @type {string | undefined} */
		this.request = request;
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	get type() {
		return "css symbol identifier";
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (this._hashUpdate === undefined) {
			// Concatenate with explicit field separators so adjacent fields
			// can't alias each other (e.g. range `[1,11]` + localName `"foo"`
			// vs range `[1,1]` + localName `"1foo"`).
			this._hashUpdate = `range|${JSON.stringify(this.range)}|localName|${this.localName}|value|${this.value || ""}|importName|${this.importName || ""}|request|${this.request || ""}`;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.localName)
			.write(this.range)
			.write(this.value)
			.write(this.importName)
			.write(this.request);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.localName = context.read();
		const c1 = context.rest;
		this.range = c1.read();
		const c2 = c1.rest;
		this.value = c2.read();
		const c3 = c2.rest;
		this.importName = c3.read();
		const c4 = c3.rest;
		this.request = c4.read();
		super.deserialize(c4.rest);
	}
}

CssIcssSymbolDependency.Template = class CssIcssSymbolDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type === CSS_TYPE) {
			const dep = /** @type {CssIcssSymbolDependency} */ (dependency);
			/** @type {string | undefined} */
			const value = dep.importName
				? CssIcssExportDependency.Template.resolve(
						dep.localName,
						dep.importName,
						templateContext,
						dep.request
					)
				: dep.value;

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

export default CssIcssSymbolDependency;

export { CssIcssSymbolDependency as "module.exports" };
