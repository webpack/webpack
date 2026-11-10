/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { CSS_TYPE } = require("../../module/ModuleSourceTypeConstants");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const NullDependency = require("../core/NullDependency");
const CssIcssExportDependency = require("./CssIcssExportDependency");

const getCssUrlDependency = memoize(() => require("./CssUrlDependency"));

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { UpdateHashContext } from "../../graph/Dependency" */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate"
 */
/** @import { Range } from "../../css/CssParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[string, Range, string | undefined, string | undefined, string | undefined, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[string, Range, string | undefined, string | undefined, string | undefined, boolean]>} ObjectSerializerContext */
/** @import Hash from "../../util/Hash" */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import CssModule from "../../css/CssModule" */
/** @import CssUrlDependency from "./CssUrlDependency" */

class CssIcssSymbolDependency extends NullDependency {
	/**
	 * Creates an instance of CssIcssSymbolDependency.
	 * @param {string} localName local name
	 * @param {Range} range range
	 * @param {string=} value value when it was defined in this module
	 * @param {string=} importName import name when it was imported from other module
	 * @param {string=} request request of the `@value` import that was active when this reference was parsed — used to disambiguate when the same local name is imported from multiple modules
	 * @param {boolean=} url whether an imported value its module resolved as a URL is written as that URL here
	 */
	constructor(localName, range, value, importName, request, url = false) {
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
		/** @type {boolean} */
		this.url = url;
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
			this._hashUpdate = `range|${JSON.stringify(this.range)}|localName|${this.localName}|value|${this.value || ""}|importName|${this.importName || ""}|request|${this.request || ""}|url|${this.url}`;
		}
		hash.update(this._hashUpdate);
		const urlDep = this._getUrlDependency(context.chunkGraph.moduleGraph);
		// The URL is written here, so the asset's hash is part of this module's.
		if (urlDep !== undefined) urlDep.updateHash(hash, context);
	}

	/**
	 * The `url()` dependency of the imported value, when this reference writes it as a URL.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {CssUrlDependency | undefined} the dependency, which the defining module owns
	 */
	_getUrlDependency(moduleGraph) {
		if (!this.url || !this.importName) return undefined;
		return CssIcssExportDependency.Template.resolveUrl(
			moduleGraph,
			/** @type {CssModule} */ (moduleGraph.getParentModule(this)),
			this.localName,
			this.importName,
			this.request
		);
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
			.write(this.request)
			.write(this.url);
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
		const c5 = c4.rest;
		this.url = c5.read();
		super.deserialize(c5.rest);
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
			const urlDep = dep._getUrlDependency(templateContext.moduleGraph);
			if (urlDep !== undefined) {
				const template =
					/** @type {InstanceType<typeof CssUrlDependency.Template>} */
					(templateContext.dependencyTemplates.get(getCssUrlDependency()));
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					template.getReplacement(urlDep, templateContext)
				);
				return;
			}
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

makeSerializable(CssIcssSymbolDependency, [
	"webpack/lib/dependencies/css/CssIcssSymbolDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CssIcssSymbolDependency"
]);

module.exports = CssIcssSymbolDependency;
