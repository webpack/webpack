/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RawDataUrlModule = require("../../asset/RawDataUrlModule");
const Dependency = require("../../graph/Dependency");
const { ASSET_URL_TYPE } = require("../../module/ModuleSourceTypeConstants");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const ModuleDependency = require("../core/ModuleDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import CodeGenerationResults from "../../module/CodeGenerationResults" */
/** @import { UpdateHashContext, DependencyKinds, TRANSITIVE } from "../../graph/Dependency" */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate"
 */
/** @import Module from "../../module/Module" */
/** @import { Range } from "../../javascript/JavascriptParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<["string" | "quoted" | "url" | "src", true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined, string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<["string" | "quoted" | "url" | "src", true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined, string | undefined]>} ObjectSerializerContext */
/** @import Hash from "../../util/Hash" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @import { NormalModuleBuildInfo } from "../../module/NormalModule" */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class CssUrlDependency extends ModuleDependency {
	/**
	 * Creates an instance of CssUrlDependency.
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 * @param {"string" | "quoted" | "url" | "src"} urlType dependency type e.g. url() or string; "quoted" is a string that must stay quoted
	 */
	constructor(request, range, urlType) {
		super(request);
		this.range = range;
		this.urlType = urlType;
		/** @type {true | undefined} */
		this.prefetch = undefined;
		/** @type {true | undefined} */
		this.preload = undefined;
		/** @type {"low" | "high" | "auto" | undefined} */
		this.fetchPriority = undefined;
		/** @type {string | undefined} */
		this.asAttribute = undefined;
		/** @type {string | undefined} */
		this.typeAttribute = undefined;
		/** @type {string | undefined} */
		this.mediaAttribute = undefined;
		/** @type {string | undefined} */
		this.valueName = undefined;
	}

	get type() {
		return "css url()";
	}

	get category() {
		return "url";
	}

	get referencedSourceType() {
		return ASSET_URL_TYPE;
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		// Modules importing a `@value` write its asset URL too.
		return this.valueName === undefined ? true : Dependency.TRANSITIVE;
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// The template substitutes the asset's hashed filename into the rendered CSS,
		// so folding that asset's content hash in here is what makes the CSS module's
		// hash, and the chunk's contenthash, follow the asset.
		const { chunkGraph } = context;
		const module = chunkGraph.moduleGraph.getModule(this);
		if (!module) return;
		const buildInfo = /** @type {NormalModuleBuildInfo | undefined} */ (
			module.buildInfo
		);
		if (buildInfo && buildInfo.hash) {
			hash.update(buildInfo.hash);
		}
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.urlType)
			.write(this.prefetch)
			.write(this.preload)
			.write(this.fetchPriority)
			.write(this.asAttribute)
			.write(this.typeAttribute)
			.write(this.mediaAttribute)
			.write(this.valueName);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.urlType = context.read();
		const c1 = context.rest;
		this.prefetch = c1.read();
		const c2 = c1.rest;
		this.preload = c2.read();
		const c3 = c2.rest;
		this.fetchPriority = c3.read();
		const c4 = c3.rest;
		this.asAttribute = c4.read();
		const c5 = c4.rest;
		this.typeAttribute = c5.read();
		const c6 = c5.rest;
		this.mediaAttribute = c6.read();
		const c7 = c6.rest;
		this.valueName = c7.read();
		super.deserialize(c7.rest);
	}
}

// Hoisted out of `cssEscapeString` so the patterns + replacer aren't
// recompiled/reallocated per `url()` / `src()` reference at code-gen.
const CSS_ESCAPE_UNQUOTED_REGEXP = /[\n\r\f\t ()'"\\]/g;
const CSS_ESCAPE_DOUBLE_REGEXP = /[\n\r\f"\\]/g;
const CSS_ESCAPE_SINGLE_REGEXP = /[\n\r\f'\\]/g;
/**
 * Returns the matched character escaped for a CSS `url()` or string.
 * @param {string} m matched character
 * @returns {string} the character escaped
 */
const cssEscapeReplacer = (m) => {
	// A backslash before a line break is a line continuation, not an escape, so
	// line breaks take a hex escape; its trailing space ends the escape.
	switch (m) {
		case "\n":
			return "\\a ";
		case "\r":
			return "\\d ";
		case "\f":
			return "\\c ";
		default:
			return `\\${m}`;
	}
};

/**
 * Returns string in quotes if needed.
 * @param {string} str string
 * @param {boolean=} quoted always return a quoted string
 * @returns {string} string in quotes if needed
 */
const cssEscapeString = (str, quoted) => {
	let countWhiteOrBracket = 0;
	let countQuotation = 0;
	let countApostrophe = 0;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		switch (cc) {
			case 9: // tab
			case 10: // nl
			case 12: // ff
			case 13: // cr
			case 32: // space
			case 40: // (
			case 41: // )
				countWhiteOrBracket++;
				break;
			case 34:
				countQuotation++;
				break;
			case 39:
				countApostrophe++;
				break;
		}
	}
	if (!quoted && countWhiteOrBracket < 2) {
		return str.replace(CSS_ESCAPE_UNQUOTED_REGEXP, cssEscapeReplacer);
	} else if (countQuotation <= countApostrophe) {
		return `"${str.replace(CSS_ESCAPE_DOUBLE_REGEXP, cssEscapeReplacer)}"`;
	}
	return `'${str.replace(CSS_ESCAPE_SINGLE_REGEXP, cssEscapeReplacer)}'`;
};

CssUrlDependency.Template = class CssUrlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type === "javascript") return;
		const dep = /** @type {CssUrlDependency} */ (dependency);
		// A `@value` definition is removed, its URL is written where it is used.
		if (dep.valueName !== undefined) return;
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			this.getReplacement(dep, templateContext)
		);
	}

	/**
	 * Returns the CSS that stands for the dependency: its asset URL, wrapped and escaped as its `urlType` needs.
	 * @param {CssUrlDependency} dep the dependency
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} the replacement
	 */
	getReplacement(dep, { moduleGraph, codeGenerationResults }) {
		const url = this.assetUrl({
			module: /** @type {Module} */ (moduleGraph.getModule(dep)),
			codeGenerationResults
		});
		switch (dep.urlType) {
			case "string":
				return cssEscapeString(url);
			case "quoted":
				return cssEscapeString(url, true);
			case "src":
				return `src(${cssEscapeString(url)})`;
			default:
				return `url(${cssEscapeString(url)})`;
		}
	}

	/**
	 * Returns the url of the asset.
	 * @param {object} options options object
	 * @param {Module} options.module the module
	 * @param {RuntimeSpec=} options.runtime runtime
	 * @param {CodeGenerationResults} options.codeGenerationResults the code generation results
	 * @returns {string} the url of the asset
	 */
	assetUrl({ runtime, module, codeGenerationResults }) {
		if (!module) {
			return "data:,";
		}
		const codeGen = codeGenerationResults.get(module, runtime);
		const data = codeGen.data;
		if (!data) return "data:,";
		const url = data.get("url");
		if (!url || !url[ASSET_URL_TYPE]) return "data:,";
		return url[ASSET_URL_TYPE];
	}
};

makeSerializable(CssUrlDependency, [
	"webpack/lib/dependencies/css/CssUrlDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CssUrlDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
CssUrlDependency.KINDS = new Set([...ModuleDependency.KINDS, "css-url"]);

module.exports = CssUrlDependency;
