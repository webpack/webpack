/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RawDataUrlModule = require("../../asset/RawDataUrlModule");
const { ASSET_URL_TYPE } = require("../../module/ModuleSourceTypeConstants");
const { RESOLVABLE_SPECIFIER_REGEXP } = require("../../util/identifier");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const { PUBLIC_PATH_AUTO } = require("../../util/publicPathPlaceholder");
const ModuleDependency = require("../core/ModuleDependency");

/** @import { ReplaceSource, Source } from "webpack-sources" */
/** @import CodeGenerationResults from "../../module/CodeGenerationResults.js" */
/** @import Dependency, { UpdateHashContext, DependencyKinds, GetConditionFn } from "../../graph/Dependency.js" */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate.js"
 */
/** @import Module from "../../module/Module.js" */
/** @import { NormalModuleBuildInfo } from "../../module/NormalModule.js" */
/** @import { HtmlModuleBuildInfo } from "../../html/HtmlModule.js" */
/** @import { Range } from "../../javascript/JavascriptParser.js" */
/** @typedef {GenericObjectDeserializerContext<[HtmlSourceDependency["prefetch"], HtmlSourceDependency["preload"], HtmlSourceDependency["fetchPriority"], HtmlSourceDependency["asAttribute"], HtmlSourceDependency["typeAttribute"], HtmlSourceDependency["mediaAttribute"], HtmlSourceDependency["nomoduleRange"], HtmlSourceDependency["srcset"], HtmlSourceDependency["valueQuote"]]>} ObjectDeserializerContext */
/** @typedef {GenericObjectSerializerContext<[HtmlSourceDependency["prefetch"], HtmlSourceDependency["preload"], HtmlSourceDependency["fetchPriority"], HtmlSourceDependency["asAttribute"], HtmlSourceDependency["typeAttribute"], HtmlSourceDependency["mediaAttribute"], HtmlSourceDependency["nomoduleRange"], HtmlSourceDependency["srcset"], HtmlSourceDependency["valueQuote"]]>} ObjectSerializerContext */
/** @import Hash from "../../util/Hash.js" */
/** @import ModuleGraph from "../../graph/ModuleGraph.js" */
/** @import WebpackError from "../../errors/WebpackError.js" */
/** @import { RuntimeSpec } from "../../util/runtime.js" */
/** @import { ObjectDeserializerContext as GenericObjectDeserializerContext, ObjectSerializerContext as GenericObjectSerializerContext } from "../../serialization/ObjectMiddleware.js" */

const getHtmlSyntaxParser = memoize(() => require("../../html/syntax").parser);

const APOSTROPHE_REGEXP = /'/g;
const LESS_THAN_REGEXP = /</g;
// Only ASCII whitespace and boundary commas separate srcset candidates.
const SRCSET_URL_ESCAPE_REGEXP = /[\t\n\f\r ]|^,+|,+$/g;

/**
 * Escapes a URL for the attribute value it replaces. The source's own
 * character references were decoded when the page was parsed, so a URL kept
 * as written (an external such as `https://...?a=1&amp;copy=2`) has to be
 * re-encoded, or the browser decodes it a second time. Only an `&` a
 * reference could start after is escaped (`?a=1&b=2` stays as it is, the way
 * the minifier writes it); both quotes are, because the value may sit in
 * either quote, or none.
 * @param {string} value the URL
 * @returns {string} the URL, safe in any attribute value
 */
const escapeAttributeUrl = (value) => {
	if (!/[&"'\r]/.test(value)) return value;
	return getHtmlSyntaxParser()
		.escapeAttribute(value, undefined, true)
		.replace(APOSTROPHE_REGEXP, "&#39;");
};

// An unquoted value ends at whitespace or `>`, so there the URL's own take a
// character reference, which the value decodes back to the same character.
const UNQUOTED_ATTRIBUTE_END_REGEXP = /[\t\n\f >]/g;
/** @type {Record<string, string>} */
const UNQUOTED_ATTRIBUTE_ESCAPES = {
	"\t": "&#9;",
	"\n": "&#10;",
	"\f": "&#12;",
	" ": "&#32;",
	">": "&gt;"
};

/**
 * Returns the character reference an unquoted attribute value writes for a
 * character that would end it.
 * @param {string} char the character
 * @returns {string} its reference
 */
const escapeUnquotedChar = (char) => UNQUOTED_ATTRIBUTE_ESCAPES[char];

const getModuleSyntax = memoize(() => require("../../html/moduleSyntax"));

const getDocumentEncoding = memoize(() =>
	require("../../html/documentEncoding")
);
const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

/** @type {WeakMap<Module, { source: Source, value: boolean }>} */
const moduleScriptCache = new WeakMap();

/**
 * Whether the file a `nomodule` script loads uses module syntax.
 * @param {Module | null | undefined} module the module of the file
 * @returns {boolean} true, when it parses only as a module
 */
const isModuleScript = (module) => {
	if (!module) return false;
	const source = module.originalSource();
	if (!source) return false;
	const cached = moduleScriptCache.get(module);
	if (cached !== undefined && cached.source === source) return cached.value;
	const content = source.source();
	const value = getModuleSyntax().usesModuleSyntax(
		typeof content === "string" ? content : content.toString("utf8")
	);
	moduleScriptCache.set(module, { source, value });
	return value;
};

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class HtmlSourceDependency extends ModuleDependency {
	/**
	 * Creates an instance of HtmlSourceDependency.
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
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
		/** @type {Range | undefined} */
		this.nomoduleRange = undefined;
		/** @type {boolean} */
		this.srcset = false;
		// The quote around the attribute value holding the URL, `""` when the
		// value is unquoted; `undefined` for a URL outside an attribute.
		/** @type {string | undefined} */
		this.valueQuote = undefined;
	}

	get type() {
		return "html source()";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		if (this.nomoduleRange === undefined) return null;
		// a `nomodule` script its browsers cannot parse is not emitted
		return (connection) => !isModuleScript(connection.resolvedModule);
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		if (
			this.nomoduleRange === undefined ||
			!isModuleScript(moduleGraph.getModule(this))
		) {
			return null;
		}
		const UnsupportedFeatureWarning = getUnsupportedFeatureWarning();
		return [
			new UnsupportedFeatureWarning(
				getModuleSyntax().NOMODULE_MODULE_SYNTAX_MESSAGE,
				this.loc
			)
		];
	}

	get category() {
		return "url";
	}

	get referencedSourceType() {
		return ASSET_URL_TYPE;
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
		// Fold in the asset's hash so the HTML invalidates when the embedded URL changes.
		const { chunkGraph } = context;
		const module = chunkGraph.moduleGraph.getModule(this);
		if (!module) return;
		const { hash: buildHash } = /** @type {NormalModuleBuildInfo} */ (
			module.buildInfo
		);
		if (buildHash) hash.update(buildHash);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.prefetch)
			.write(this.preload)
			.write(this.fetchPriority)
			.write(this.asAttribute)
			.write(this.typeAttribute)
			.write(this.mediaAttribute)
			.write(this.nomoduleRange)
			.write(this.srcset)
			.write(this.valueQuote);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.prefetch = context.read();
		const c1 = context.rest;
		this.preload = c1.read();
		const c2 = c1.rest;
		this.fetchPriority = c2.read();
		const c3 = c2.rest;
		this.asAttribute = c3.read();
		const c4 = c3.rest;
		this.typeAttribute = c4.read();
		const c5 = c4.rest;
		this.mediaAttribute = c5.read();
		const c6 = c5.rest;
		this.nomoduleRange = c6.read();
		const c7 = c6.rest;
		this.srcset = c7.read();
		const c8 = c7.rest;
		this.valueQuote = c8.read();
		super.deserialize(c8.rest);
	}
}

HtmlSourceDependency.Template = class HtmlSourceDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module: page, moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		const dep = /** @type {HtmlSourceDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));
		if (dep.nomoduleRange !== undefined && isModuleScript(module)) {
			source.replace(dep.nomoduleRange[0], dep.nomoduleRange[1] - 1, "");
			return;
		}

		/** @type {string} */
		let newValue = this.assetUrl({
			module,
			codeGenerationResults
		});
		// A relative `publicPath` emits page-relative URLs a relative `<base href>`
		// redirects too; an `auto` one is cancelled where its placeholder resolves.
		const { baseUrlPrefix } = /** @type {HtmlModuleBuildInfo} */ (
			page.buildInfo
		);
		if (
			baseUrlPrefix !== undefined &&
			newValue[0] !== "#" &&
			!newValue.startsWith(PUBLIC_PATH_AUTO) &&
			(newValue[0] === "." || !RESOLVABLE_SPECIFIER_REGEXP.test(newValue))
		) {
			newValue = baseUrlPrefix + newValue;
		}

		if (dep.srcset && newValue !== "data:,") {
			newValue = newValue.replace(SRCSET_URL_ESCAPE_REGEXP, encodeURIComponent);
		}
		newValue = escapeAttributeUrl(newValue);
		// In an attribute, `<` ends no value, but a decoded `</noscript>` would
		// end the element around it where scripting is on.
		if (dep.valueQuote !== undefined) {
			newValue = newValue.replace(LESS_THAN_REGEXP, "&lt;");
		}
		// The attribute's own quote decides; a URL in CSS text (`url("...")`)
		// may sit in a quote of its own inside an unquoted value.
		let quoted;
		if (dep.valueQuote !== undefined) {
			quoted = dep.valueQuote !== "";
		} else {
			// A string and a `Buffer` both read the ASCII quote at that offset.
			const original = source.original().source();
			const before =
				typeof original === "string"
					? original.charCodeAt(dep.range[0] - 1)
					: original[dep.range[0] - 1];
			quoted = before === 34 || before === 39;
		}
		if (!quoted) {
			newValue = newValue.replace(
				UNQUOTED_ATTRIBUTE_END_REGEXP,
				escapeUnquotedChar
			);
		}
		// a page in another encoding gets the url in it
		newValue = getDocumentEncoding().toPage(
			page,
			newValue,
			getDocumentEncoding().escapeHtmlCodePoint
		);
		source.replace(dep.range[0], dep.range[1] - 1, newValue);
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

makeSerializable(HtmlSourceDependency, [
	"webpack/lib/dependencies/html/HtmlSourceDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/HtmlSourceDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
HtmlSourceDependency.KINDS = new Set([
	...ModuleDependency.KINDS,
	"html-source"
]);

module.exports = HtmlSourceDependency;
