/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");
const {
	AsyncSeriesBailHook,
	AsyncSeriesHook,
	HookMap,
	SyncBailHook,
	SyncHook,
	SyncWaterfallHook
} = require("tapable");
const ChunkGraph = require("./ChunkGraph");
const Module = require("./Module");
const ModuleFactory = require("./ModuleFactory");
const ModuleGraph = require("./ModuleGraph");
const { JAVASCRIPT_MODULE_TYPE_AUTO } = require("./ModuleTypeConstants");
const NormalModule = require("./NormalModule");
const { ImportPhaseUtils } = require("./dependencies/ImportPhase");
const { getContext } = require("./loaders/LoaderRunner");
const BasicEffectRulePlugin = require("./rules/BasicEffectRulePlugin");
const BasicMatcherRulePlugin = require("./rules/BasicMatcherRulePlugin");
const GlobMatcherRulePlugin = require("./rules/GlobMatcherRulePlugin");
const ObjectMatcherRulePlugin = require("./rules/ObjectMatcherRulePlugin");
const RuleSetCompiler = require("./rules/RuleSetCompiler");
const UseEffectRulePlugin = require("./rules/UseEffectRulePlugin");
const LazySet = require("./util/LazySet");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const { cachedCleverMerge, cachedSetProperty } = require("./util/cleverMerge");
const {
	applyCaseCorrections,
	findCaseMismatch
} = require("./util/findCaseMismatch");
const { dirname, join, relative } = require("./util/fs");
const {
	ABSOLUTE_PATH_REGEXP,
	WINDOWS_PATH_SEPARATOR_REGEXP,
	escapeHashInPathRequest,
	parseResource,
	parseResourceWithoutFragment
} = require("./util/identifier");
const matchAlias = require("./util/matchAlias");

/** @typedef {import("enhanced-resolve").Resolver["options"]["alias"]} AliasOptions */
/** @import { ResolveContext, ResolveRequest } from "enhanced-resolve" */
/**
 * @import {
 * 	ModuleOptionsNormalized as ModuleOptions,
 * 	RuleSetRule,
 * 	JavascriptParserOptions,
 * 	EmptyGeneratorOptions,
 * 	JsonParserOptions,
 * 	JsonGeneratorOptions,
 * 	AssetParserOptions,
 * 	EmptyParserOptions,
 * 	AssetGeneratorOptions,
 * 	CssParserOptions,
 * 	CssModuleParserOptions,
 * 	CssGeneratorOptions,
 * 	CssModuleGeneratorOptions,
 * 	EmptyParserOptions as HtmlParserOptions,
 * 	HtmlGeneratorOptions
 * } from "../declarations/WebpackOptions"
 */
/** @import { FileSystemDependencies } from "./Compilation" */
/** @import Generator from "./Generator" */
/**
 * @import {
 * 	ModuleFactoryCallback,
 * 	ModuleFactoryCreateData,
 * 	ModuleFactoryCreateDataContextInfo,
 * 	ModuleFactoryResult
 * } from "./ModuleFactory"
 */
/**
 * @import {
 * 	GeneratorOptions,
 * 	LoaderItem,
 * 	NormalModuleCreateData,
 * 	ParserOptions
 * } from "./NormalModule"
 */
/** @import Parser from "./Parser" */
/** @import ResolverFactory, { ResolverWithOptions } from "./ResolverFactory" */
/** @import ModuleDependency from "./dependencies/ModuleDependency" */
/**
 * @import {
 * 	ImportPhaseType,
 * 	ImportPhaseName
 * } from "./dependencies/ImportPhase"
 */
/**
 * @import JavascriptParser, {
 * 	ImportAttributes
 * } from "./javascript/JavascriptParser"
 */
/** @import { RuleSetRules, RuleSet } from "./rules/RuleSetCompiler" */
/** @import { InputFileSystem } from "./util/fs" */
/** @import { AssociatedObjectForCache } from "./util/identifier" */

/**
 * Defines the callback type used by this module.
 * @template T
 * @typedef {import("./Compiler").Callback<T>} Callback
 */

/** @typedef {Pick<RuleSetRule, "type" | "sideEffects" | "parser" | "generator" | "resolve" | "layer" | "extractSourceMap">} ModuleSettings */
/** @typedef {NormalModuleCreateData & { settings: ModuleSettings }} CreateData */

/**
 * Defines the resolve data type used by this module.
 * @typedef {object} ResolveData
 * @property {ModuleFactoryCreateData["contextInfo"]} contextInfo
 * @property {ModuleFactoryCreateData["resolveOptions"]} resolveOptions
 * @property {string} context
 * @property {string} request
 * @property {ImportPhaseName=} phase
 * @property {ImportAttributes=} attributes
 * @property {ModuleDependency[]} dependencies
 * @property {string} dependencyType
 * @property {Partial<CreateData>} createData
 * @property {FileSystemDependencies} fileDependencies
 * @property {FileSystemDependencies} missingDependencies
 * @property {FileSystemDependencies} contextDependencies
 * @property {Module=} ignoredModule
 * @property {boolean} cacheable allow to use the unsafe cache
 */

/**
 * Defines the resource data type used by this module.
 * @typedef {object} ResourceData
 * @property {string} resource
 * @property {string=} path
 * @property {string=} query
 * @property {string=} fragment
 * @property {string=} context
 */

/**
 * Defines the resource scheme data type used by this module.
 * @typedef {object} ResourceSchemeData
 * @property {string=} mimetype mime type of the resource
 * @property {string=} parameters additional parameters for the resource
 * @property {"base64" | false=} encoding encoding of the resource
 * @property {string=} encodedContent encoded content of the resource
 */

/** @typedef {ResourceData & { data: ResourceSchemeData & Partial<ResolveRequest> }} ResourceDataWithData */

/**
 * Defines the parsed loader request type used by this module.
 * @typedef {object} ParsedLoaderRequest
 * @property {string} loader loader
 * @property {string | undefined} options options
 */

/**
 * Dependencies captured while resolving a loader.
 * @typedef {object} ResolveDependencies
 * @property {LazySet<string>} fileDependencies file dependencies of the resolve
 * @property {LazySet<string>} contextDependencies context dependencies of the resolve
 * @property {LazySet<string>} missingDependencies missing dependencies of the resolve
 */

/**
 * Memoized result of resolving a loader for a given (context, request).
 * @typedef {ResolveDependencies & { loader: string, query: string | undefined, type: string | undefined }} LoaderResolveCacheEntry
 */

/**
 * @import {
 * 	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
 * 	JAVASCRIPT_MODULE_TYPE_ESM,
 * 	JSON_MODULE_TYPE,
 * 	ASSET_MODULE_TYPE,
 * 	ASSET_MODULE_TYPE_INLINE,
 * 	ASSET_MODULE_TYPE_RESOURCE,
 * 	ASSET_MODULE_TYPE_SOURCE,
 * 	ASSET_MODULE_TYPE_BYTES,
 * 	WEBASSEMBLY_MODULE_TYPE_ASYNC,
 * 	WEBASSEMBLY_MODULE_TYPE_SYNC,
 * 	CSS_MODULE_TYPE,
 * 	CSS_MODULE_TYPE_GLOBAL,
 * 	CSS_MODULE_TYPE_MODULE,
 * 	CSS_MODULE_TYPE_AUTO,
 * 	HTML_MODULE_TYPE
 * } from "./ModuleTypeConstants"
 */

/** @typedef {JAVASCRIPT_MODULE_TYPE_AUTO | JAVASCRIPT_MODULE_TYPE_DYNAMIC | JAVASCRIPT_MODULE_TYPE_ESM | JSON_MODULE_TYPE | ASSET_MODULE_TYPE | ASSET_MODULE_TYPE_INLINE | ASSET_MODULE_TYPE_RESOURCE | ASSET_MODULE_TYPE_SOURCE | WEBASSEMBLY_MODULE_TYPE_ASYNC | WEBASSEMBLY_MODULE_TYPE_SYNC | CSS_MODULE_TYPE | CSS_MODULE_TYPE_GLOBAL | CSS_MODULE_TYPE_MODULE | CSS_MODULE_TYPE_AUTO | HTML_MODULE_TYPE} KnownNormalModuleTypes */
/** @typedef {KnownNormalModuleTypes | string} NormalModuleTypes */

const EMPTY_RESOLVE_OPTIONS = {};
/** @type {ParserOptions} */
const EMPTY_PARSER_OPTIONS = {};
/** @type {GeneratorOptions} */
const EMPTY_GENERATOR_OPTIONS = {};
/** @type {ParsedLoaderRequest[]} */
const EMPTY_ELEMENTS = [];

const MATCH_RESOURCE_REGEX = /^([^!]+)!=!/;
const LEADING_DOT_EXTENSION_REGEX = /^[^.]/;
// Nothing in `util/identifier` matches a request (as opposed to a path) shape.
const RELATIVE_REQUEST_REGEXP = /^\.\.?[\\/]/;

/**
 * Computes the edit distance of two strings, counting swapped neighbors as one
 * edit and giving up as soon as the distance exceeds `max`.
 * @param {string} a first string
 * @param {string} b second string
 * @param {number} max largest distance worth distinguishing
 * @returns {number} the distance, or a value greater than `max` when it exceeds `max`
 */
const editDistance = (a, b, max) => {
	if (a === b) return 0;
	if (Math.abs(a.length - b.length) > max) return max + 1;
	/** @type {number[] | undefined} */
	let rowBeforePrevious;
	/** @type {number[]} */
	let previousRow = [];
	for (let column = 0; column <= b.length; column++) previousRow.push(column);
	for (let row = 1; row <= a.length; row++) {
		const currentRow = [row];
		let rowMinimum = row;
		for (let column = 1; column <= b.length; column++) {
			let distance = Math.min(
				previousRow[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
				previousRow[column] + 1,
				currentRow[column - 1] + 1
			);
			if (
				rowBeforePrevious &&
				a[row - 1] === b[column - 2] &&
				a[row - 2] === b[column - 1]
			) {
				distance = Math.min(distance, rowBeforePrevious[column - 2] + 1);
			}
			currentRow.push(distance);
			if (distance < rowMinimum) rowMinimum = distance;
		}
		if (rowMinimum > max) return max + 1;
		rowBeforePrevious = previousRow;
		previousRow = currentRow;
	}
	return previousRow[b.length];
};

/**
 * Names an entry of a directory can be requested by: as written, and without
 * the extension the resolver would have appended.
 * @param {string} entry name of a directory entry
 * @param {Set<string>} extensions the resolvable extensions
 * @returns {string[]} names the entry answers to
 */
const namesForEntry = (entry, extensions) => {
	const names = [entry];
	for (const extension of extensions) {
		if (entry.length > extension.length && entry.endsWith(extension)) {
			names.push(entry.slice(0, -extension.length));
		}
	}
	return names;
};

/**
 * Picks the entry of a directory a failed request most likely meant. Ties are
 * broken by name so the hint does not depend on the order the directory lists.
 * @param {string} requested the requested file name
 * @param {string[]} entries names in the directory
 * @param {Set<string>} extensions the resolvable extensions
 * @returns {{ entry: string, distance: number } | undefined} the closest entry and how far it is from the request
 */
const findClosestEntry = (requested, entries, extensions) => {
	// A typo is only distinguishable from an unrelated name once the name is
	// long enough, so short requests are matched by casing alone.
	let allowedDistance = requested.length < 4 ? 0 : requested.length < 8 ? 1 : 2;
	const lowerCaseRequested = requested.toLowerCase();
	/** @type {{ entry: string, distance: number } | undefined} */
	let best;
	for (const entry of entries) {
		// The entry exists as requested, so the request failed for another reason.
		if (entry === requested) return;
		for (const name of namesForEntry(entry, extensions)) {
			const distance = editDistance(
				lowerCaseRequested,
				name.toLowerCase(),
				allowedDistance
			);
			if (distance > allowedDistance) continue;
			if (best && distance === allowedDistance && entry >= best.entry) continue;
			allowedDistance = distance;
			best = { entry, distance };
		}
	}
	return best;
};

/** Bounds the walk up the context when a module request is looked up. */
const MAX_MODULE_LOOKUP_DIRECTORIES = 10;

/** Bounds the paths a failed request is looked for under, aliases included. */
const MAX_SUGGESTION_CANDIDATES = 20;

/**
 * Directories a module request is looked up in, nearest first.
 * @param {InputFileSystem} fs input file system
 * @param {string} context directory the request comes from
 * @param {Iterable<string | string[]>} modules the `resolve.modules` entries
 * @returns {string[]} absolute directories
 */
const moduleLookupDirectories = (fs, context, modules) => {
	/** @type {string[]} */
	const relativeNames = [];
	/** @type {string[]} */
	const directories = [];
	for (const entry of modules) {
		for (const name of Array.isArray(entry) ? entry : [entry]) {
			if (ABSOLUTE_PATH_REGEXP.test(name)) {
				directories.push(name);
			} else {
				relativeNames.push(name);
			}
		}
	}
	let current = context;
	while (
		relativeNames.length > 0 &&
		directories.length < MAX_MODULE_LOOKUP_DIRECTORIES
	) {
		for (const name of relativeNames) directories.push(join(fs, current, name));
		const parent = dirname(fs, current);
		if (parent === current) break;
		current = parent;
	}
	return directories;
};

/**
 * Requests an alias could have turned this one into, so a hint can look where
 * the resolver looked. Mirrors `AliasPlugin`: a name matches the whole request
 * or a leading segment of it, and `onlyModule` restricts it to the former.
 * @param {string} request the request as written
 * @param {AliasOptions} aliases the `resolve.alias` entries
 * @returns {string[]} the requests the aliases map this one to
 */
const aliasedRequests = (request, aliases) => {
	/** @type {string[]} */
	const requests = [];
	for (const { name, alias, onlyModule } of aliases) {
		if (!matchAlias(request, name, onlyModule)) continue;
		const tail = request.slice(name.length);
		for (const target of Array.isArray(alias) ? alias : [alias]) {
			// `false` tells the resolver to ignore the request, so it names no path
			if (typeof target === "string") requests.push(target + tail);
		}
	}
	return requests;
};

/**
 * Whether a request spells out directories of its own, as opposed to naming an
 * entry of the directory it is resolved against.
 * @param {string} prefix the request without its last segment
 * @returns {boolean} true when the prefix names at least one directory
 */
const namesDirectories = (prefix) =>
	prefix
		.replace(WINDOWS_PATH_SEPARATOR_REGEXP, "/")
		.split("/")
		.some((segment) => segment !== "" && segment !== "." && segment !== "..");

/**
 * Replays the file/context/missing dependencies captured by a loader resolve
 * into a resolve context, so memoized loaders still record everything needed
 * for watch invalidation.
 * @param {ResolveContext} resolveContext resolve context to add dependencies to
 * @param {ResolveDependencies} source captured resolve dependencies
 * @returns {void}
 */
const replayResolveDependencies = (resolveContext, source) => {
	// On this path resolveContext always carries the three LazySet dependency
	// sets built in the `resolve` hook, so they are safe to treat as LazySet.
	/** @type {LazySet<string>} */
	(resolveContext.fileDependencies).addAll(source.fileDependencies);
	/** @type {LazySet<string>} */
	(resolveContext.contextDependencies).addAll(source.contextDependencies);
	/** @type {LazySet<string>} */
	(resolveContext.missingDependencies).addAll(source.missingDependencies);
};

/**
 * Returns ident.
 * @param {LoaderItem} data data
 * @returns {string} ident
 */
const loaderToIdent = (data) => {
	if (!data.options) {
		return data.loader;
	}
	if (typeof data.options === "string") {
		return `${data.loader}?${data.options}`;
	}
	if (typeof data.options !== "object") {
		throw new Error("loader options must be string or object");
	}
	if (data.ident) {
		return `${data.loader}??${data.ident}`;
	}
	return `${data.loader}?${JSON.stringify(data.options)}`;
};

/**
 * Stringify loaders and resource.
 * @param {LoaderItem[]} loaders loaders
 * @param {string} resource resource
 * @returns {string} stringified loaders and resource
 */
const stringifyLoadersAndResource = (loaders, resource) => {
	let str = "";
	for (const loader of loaders) {
		str += `${loaderToIdent(loader)}!`;
	}
	return str + resource;
};

/**
 * Checks whether it needs calls.
 * @param {number} times times
 * @param {(err?: null | Error) => void} callback callback
 * @returns {(err?: null | Error) => void} callback
 */
const needCalls = (times, callback) => (err) => {
	if (--times === 0) {
		return callback(err);
	}
	if (err && times > 0) {
		times = Number.NaN;
		return callback(err);
	}
};

/**
 * Merges global options.
 * @template T
 * @template O
 * @param {T} globalOptions global options
 * @param {string} type type
 * @param {O} localOptions local options
 * @returns {T & O | T | O} result
 */
const mergeGlobalOptions = (globalOptions, type, localOptions) => {
	const parts = type.split("/");
	/** @type {undefined | T} */
	let result;
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const options =
			/** @type {T} */
			(globalOptions[/** @type {keyof T} */ (current)]);
		if (typeof options === "object") {
			result =
				result === undefined ? options : cachedCleverMerge(result, options);
		}
	}
	if (result === undefined) {
		return localOptions;
	}
	return cachedCleverMerge(result, localOptions);
};

// TODO webpack 6 remove
/**
 * Deprecation changed hook message.
 * @template {import("tapable").Hook<EXPECTED_ANY, EXPECTED_ANY>} T
 * @param {string} name name
 * @param {T} hook hook
 * @returns {string} result
 */
const deprecationChangedHookMessage = (name, hook) => {
	const names = hook.taps.map((tapped) => tapped.name).join(", ");

	return (
		`NormalModuleFactory.${name} (${names}) is no longer a waterfall hook, but a bailing hook instead. ` +
		"Do not return the passed object, but modify it instead. " +
		"Returning false will ignore the request and results in no module created."
	);
};

const ruleSetCompiler = new RuleSetCompiler([
	new BasicMatcherRulePlugin("test", "resource"),
	new GlobMatcherRulePlugin("glob", "resource"),
	new BasicMatcherRulePlugin("scheme"),
	new BasicMatcherRulePlugin("mimetype"),
	new BasicMatcherRulePlugin("dependency"),
	new BasicMatcherRulePlugin("include", "resource"),
	new BasicMatcherRulePlugin("exclude", "resource", true),
	new BasicMatcherRulePlugin("resource"),
	new BasicMatcherRulePlugin("resourceQuery"),
	new BasicMatcherRulePlugin("resourceFragment"),
	new BasicMatcherRulePlugin("realResource"),
	new BasicMatcherRulePlugin("issuer"),
	new BasicMatcherRulePlugin("compiler"),
	new BasicMatcherRulePlugin("issuerLayer"),
	new BasicMatcherRulePlugin("phase"),
	new ObjectMatcherRulePlugin("assert", "attributes", (value) => {
		if (value) {
			return (
				/** @type {ImportAttributes} */ (value)._isLegacyAssert !== undefined
			);
		}

		return false;
	}),
	new ObjectMatcherRulePlugin("with", "attributes", (value) => {
		if (value) {
			return !(/** @type {ImportAttributes} */ (value)._isLegacyAssert);
		}
		return false;
	}),
	new ObjectMatcherRulePlugin("descriptionData"),
	new BasicMatcherRulePlugin("descriptionRelativePath"),
	new BasicEffectRulePlugin("type"),
	new BasicEffectRulePlugin("sideEffects"),
	new BasicEffectRulePlugin("parser"),
	new BasicEffectRulePlugin("resolve"),
	new BasicEffectRulePlugin("generator"),
	new BasicEffectRulePlugin("layer"),
	new BasicEffectRulePlugin("extractSourceMap"),
	new UseEffectRulePlugin()
]);

/** @import JavascriptGenerator from "./javascript/JavascriptGenerator" */

/** @import JsonParser from "./json/JsonParser" */
/** @import JsonGenerator from "./json/JsonGenerator" */

/** @import AssetParser from "./asset/AssetParser" */
/** @import AssetSourceParser from "./asset/AssetSourceParser" */
/** @import AssetBytesParser from "./asset/AssetBytesParser" */
/** @import AssetGenerator from "./asset/AssetGenerator" */
/** @import AssetSourceGenerator from "./asset/AssetSourceGenerator" */
/** @import AssetBytesGenerator from "./asset/AssetBytesGenerator" */

/** @import AsyncWebAssemblyParser from "./wasm-async/AsyncWebAssemblyParser" */
/** @import WebAssemblyParser from "./wasm-sync/WebAssemblyParser" */

/** @import CssParser from "./css/CssParser" */
/** @import CssGenerator from "./css/CssGenerator" */

/** @import HtmlParser from "./html/HtmlParser" */
/** @import HtmlGenerator from "./html/HtmlGenerator" */

/* eslint-disable jsdoc/type-formatting */
/**
 * Defines the shared type used by this module.
 * @typedef {[
 * [JAVASCRIPT_MODULE_TYPE_AUTO, JavascriptParser, JavascriptParserOptions, JavascriptGenerator, EmptyGeneratorOptions],
 * [JAVASCRIPT_MODULE_TYPE_DYNAMIC, JavascriptParser, JavascriptParserOptions, JavascriptGenerator, EmptyGeneratorOptions],
 * [JAVASCRIPT_MODULE_TYPE_ESM, JavascriptParser, JavascriptParserOptions, JavascriptGenerator, EmptyGeneratorOptions],
 * [JSON_MODULE_TYPE, JsonParser, JsonParserOptions, JsonGenerator, JsonGeneratorOptions],
 * [ASSET_MODULE_TYPE, AssetParser, AssetParserOptions, AssetGenerator, AssetGeneratorOptions],
 * [ASSET_MODULE_TYPE_INLINE, AssetParser, EmptyParserOptions, AssetGenerator, AssetGeneratorOptions],
 * [ASSET_MODULE_TYPE_RESOURCE, AssetParser, EmptyParserOptions, AssetGenerator, AssetGeneratorOptions],
 * [ASSET_MODULE_TYPE_SOURCE, AssetSourceParser, EmptyParserOptions, AssetSourceGenerator, EmptyGeneratorOptions],
 * [ASSET_MODULE_TYPE_BYTES, AssetBytesParser, EmptyParserOptions, AssetBytesGenerator, EmptyGeneratorOptions],
 * [WEBASSEMBLY_MODULE_TYPE_ASYNC, AsyncWebAssemblyParser, EmptyParserOptions, Generator, EmptyGeneratorOptions],
 * [WEBASSEMBLY_MODULE_TYPE_SYNC, WebAssemblyParser, EmptyParserOptions, Generator, EmptyGeneratorOptions],
 * [CSS_MODULE_TYPE, CssParser, CssParserOptions, CssGenerator, CssGeneratorOptions],
 * [CSS_MODULE_TYPE_AUTO, CssParser, CssModuleParserOptions, CssGenerator, CssModuleGeneratorOptions],
 * [CSS_MODULE_TYPE_MODULE, CssParser, CssModuleParserOptions, CssGenerator, CssModuleGeneratorOptions],
 * [CSS_MODULE_TYPE_GLOBAL, CssParser, CssModuleParserOptions, CssGenerator, CssModuleGeneratorOptions],
 * [HTML_MODULE_TYPE, HtmlParser, HtmlParserOptions, HtmlGenerator, HtmlGeneratorOptions],
 * [string, Parser, ParserOptions, Generator, GeneratorOptions],
 * ]} ParsersAndGeneratorsByTypes
 */
/* eslint-enable jsdoc/type-formatting */

/**
 * Defines the extract tuple elements type used by this module.
 * @template {unknown[]} T
 * @template {number[]} I
 * @typedef {{ [K in keyof I]: K extends keyof I ? I[K] extends keyof T ? T[I[K]] : never : never }} ExtractTupleElements
 */

/**
 * Represents the normal module factory runtime component.
 * @template {unknown[]} T
 * @template {number[]} A
 * @template [R=void]
 * @typedef {T extends [infer Head extends [string, ...unknown[]], ...infer Tail extends [string, ...unknown[]][]] ? Record<Head[0], SyncBailHook<ExtractTupleElements<Head, A>, R extends number ? Head[R] : R>> & RecordFactoryFromTuple<Tail, A, R> : unknown } RecordFactoryFromTuple
 */

/**
 * Maps each tuple in `T` to a record from its `[0]` key to its `[I]` value.
 * @template {unknown[]} T
 * @template {number} I
 * @typedef {T extends [infer Head extends [string, ...unknown[]], ...infer Tail extends [string, ...unknown[]][]] ? Record<Head[0], I extends keyof Head ? Head[I] : never> & TupleToTypeMap<Tail, I> : unknown } TupleToTypeMap
 */

/** @typedef {TupleToTypeMap<ParsersAndGeneratorsByTypes, 1>} ParserByType */
/** @typedef {TupleToTypeMap<ParsersAndGeneratorsByTypes, 2>} ParserOptionsByType */
/** @typedef {TupleToTypeMap<ParsersAndGeneratorsByTypes, 3>} GeneratorByType */
/** @typedef {TupleToTypeMap<ParsersAndGeneratorsByTypes, 4>} GeneratorOptionsByType */

class NormalModuleFactory extends ModuleFactory {
	/**
	 * Creates an instance of NormalModuleFactory.
	 * @param {object} param params
	 * @param {string=} param.context context
	 * @param {InputFileSystem} param.fs file system
	 * @param {ResolverFactory} param.resolverFactory resolverFactory
	 * @param {ModuleOptions} param.options options
	 * @param {AssociatedObjectForCache} param.associatedObjectForCache an object to which the cache will be attached
	 */
	constructor({
		context,
		fs,
		resolverFactory,
		options,
		associatedObjectForCache
	}) {
		super();
		this.hooks = Object.freeze({
			/** @type {AsyncSeriesBailHook<[ResolveData], Module | false | void>} */
			resolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {HookMap<AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>>} */
			resolveForScheme: new HookMap(
				() => new AsyncSeriesBailHook(["resourceData", "resolveData"])
			),
			/**
			 * @type {HookMap<AsyncSeriesBailHook<[ResourceDataWithData, ResolveData], true | void>>}
			 * @since 5.49.0
			 */
			resolveInScheme: new HookMap(
				() => new AsyncSeriesBailHook(["resourceData", "resolveData"])
			),
			/** @type {AsyncSeriesBailHook<[ResolveData], Module | undefined>} */
			factorize: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<[ResolveData], false | void>} */
			beforeResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<[ResolveData], false | void>} */
			afterResolve: new AsyncSeriesBailHook(["resolveData"]),
			/** @type {AsyncSeriesBailHook<[CreateData, ResolveData], Module | void>} */
			createModule: new AsyncSeriesBailHook(["createData", "resolveData"]),
			/** @type {SyncWaterfallHook<[Module, CreateData, ResolveData]>} */
			module: new SyncWaterfallHook(["module", "createData", "resolveData"]),
			/**
			 * @type {HookMap<AsyncSeriesHook<[]>>}
			 * @since 5.110.0
			 */
			prepareModuleType: new HookMap(() => new AsyncSeriesHook([])),
			/** @type {import("tapable").TypedHookMap<RecordFactoryFromTuple<ParsersAndGeneratorsByTypes, [2], 1>>} */
			createParser: new HookMap(() => new SyncBailHook(["parserOptions"])),
			/** @type {import("tapable").TypedHookMap<RecordFactoryFromTuple<ParsersAndGeneratorsByTypes, [1, 2]>>} */
			parser: new HookMap(() => new SyncHook(["parser", "parserOptions"])),
			/** @type {import("tapable").TypedHookMap<RecordFactoryFromTuple<ParsersAndGeneratorsByTypes, [4], 3>>} */
			createGenerator: new HookMap(
				() => new SyncBailHook(["generatorOptions"])
			),
			/** @type {import("tapable").TypedHookMap<RecordFactoryFromTuple<ParsersAndGeneratorsByTypes, [3, 4]>>} */
			generator: new HookMap(
				() => new SyncHook(["generator", "generatorOptions"])
			),
			/**
			 * @type {HookMap<SyncBailHook<[CreateData, ResolveData], Module | void>>}
			 * @since 5.81.0
			 */
			createModuleClass: new HookMap(
				() => new SyncBailHook(["createData", "resolveData"])
			)
		});
		/** @type {ResolverFactory} */
		this.resolverFactory = resolverFactory;
		/** @type {RuleSet} */
		this.ruleSet = ruleSetCompiler.compile([
			{
				rules: /** @type {RuleSetRules} */ (options.defaultRules)
			},
			{
				rules: /** @type {RuleSetRules} */ (options.rules)
			}
		]);
		/** @type {string} */
		this.context = context || "";
		/** @type {InputFileSystem} */
		this.fs = fs;
		this._globalParserOptions = options.parser;
		this._globalGeneratorOptions = options.generator;
		/** @type {Map<string, WeakMap<ParserOptions, Parser>>} */
		this.parserCache = new Map();
		/** @type {Map<string, WeakMap<GeneratorOptions, Generator>>} */
		this.generatorCache = new Map();
		// `true` once a type is prepared, otherwise the calls waiting on the
		// in-flight `prepareModuleType` for it
		/** @type {Map<string, true | Callback<void>[]>} */
		this._moduleTypePreparation = new Map();
		/** @type {Set<Module>} */
		this._restoredUnsafeCacheEntries = new Set();
		/** @type {Map<string, LoaderResolveCacheEntry>} */
		this._loaderResolveCache = new Map();

		/** @type {(resource: string) => import("./util/identifier").ParsedResource} */
		const cacheParseResource = parseResource.bindCache(
			associatedObjectForCache
		);
		const cachedParseResourceWithoutFragment =
			parseResourceWithoutFragment.bindCache(associatedObjectForCache);
		this._parseResourceWithoutFragment = cachedParseResourceWithoutFragment;

		this.hooks.factorize.tapAsync(
			{
				name: "NormalModuleFactory",
				stage: 100
			},
			(resolveData, callback) => {
				this.hooks.resolve.callAsync(resolveData, (err, result) => {
					if (err) return callback(err);

					// Ignored
					if (result === false) return callback();

					// direct module
					if (result instanceof Module) return callback(null, result);

					if (typeof result === "object") {
						throw new Error(
							`${deprecationChangedHookMessage(
								"resolve",
								this.hooks.resolve
							)} Returning a Module object will result in this module used as result.`
						);
					}

					this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
						if (err) return callback(err);

						if (typeof result === "object") {
							throw new Error(
								deprecationChangedHookMessage(
									"afterResolve",
									this.hooks.afterResolve
								)
							);
						}

						// Ignored
						if (result === false) return callback();

						const createData =
							/** @type {CreateData} */
							(resolveData.createData);

						this.hooks.createModule.callAsync(
							createData,
							resolveData,
							(err, createdModule) => {
								if (!createdModule) {
									if (!resolveData.request) {
										return callback(new Error("Empty dependency (no request)"));
									}

									// TODO webpack 6 make it required and move javascript/wasm/asset properties to own module
									createdModule = this.hooks.createModuleClass
										.for(createData.settings.type)
										.call(createData, resolveData);

									if (!createdModule) {
										createdModule = /** @type {Module} */ (
											new NormalModule(createData)
										);
									}
								}

								createdModule = this.hooks.module.call(
									createdModule,
									createData,
									resolveData
								);

								return callback(null, createdModule);
							}
						);
					});
				});
			}
		);
		this.hooks.resolve.tapAsync(
			{
				name: "NormalModuleFactory",
				stage: 100
			},
			(data, callback) => {
				const {
					contextInfo,
					context,
					dependencies,
					dependencyType,
					request,
					phase,
					attributes,
					resolveOptions,
					fileDependencies,
					missingDependencies,
					contextDependencies
				} = data;
				const loaderResolver = this.getResolver("loader");

				/** @type {ResourceData | undefined} */
				let matchResourceData;
				/** @type {string} */
				let unresolvedResource;
				/** @type {ParsedLoaderRequest[]} */
				let elements;
				let noPreAutoLoaders = false;
				let noAutoLoaders = false;
				let noPrePostAutoLoaders = false;

				const contextScheme = getScheme(context);
				/** @type {string | undefined} */
				let scheme = getScheme(request);

				if (!scheme) {
					/** @type {string} */
					let requestWithoutMatchResource = request;
					const matchResourceMatch = MATCH_RESOURCE_REGEX.exec(request);
					if (matchResourceMatch) {
						let matchResource = matchResourceMatch[1];
						// Check if matchResource starts with ./ or ../
						if (matchResource.charCodeAt(0) === 46) {
							// 46 is "."
							const secondChar = matchResource.charCodeAt(1);
							if (
								secondChar === 47 || // 47 is "/"
								(secondChar === 46 && matchResource.charCodeAt(2) === 47) // "../"
							) {
								// Resolve relative path against context
								matchResource = join(this.fs, context, matchResource);
							}
						}

						matchResourceData = {
							...cacheParseResource(matchResource),
							resource: matchResource
						};
						requestWithoutMatchResource = request.slice(
							matchResourceMatch[0].length
						);
					}

					scheme = getScheme(requestWithoutMatchResource);

					if (!scheme && !contextScheme) {
						const firstChar = requestWithoutMatchResource.charCodeAt(0);
						const secondChar = requestWithoutMatchResource.charCodeAt(1);
						noPreAutoLoaders = firstChar === 45 && secondChar === 33; // startsWith "-!"
						noAutoLoaders = noPreAutoLoaders || firstChar === 33; // startsWith "!"
						noPrePostAutoLoaders = firstChar === 33 && secondChar === 33; // startsWith "!!";
						const rawElements = requestWithoutMatchResource
							.slice(
								noPreAutoLoaders || noPrePostAutoLoaders
									? 2
									: noAutoLoaders
										? 1
										: 0
							)
							.split(/!+/);
						unresolvedResource = /** @type {string} */ (rawElements.pop());
						elements = rawElements.map((el) => {
							const { path, query } = cachedParseResourceWithoutFragment(el);
							return {
								loader: path,
								options: query ? query.slice(1) : undefined
							};
						});
						scheme = getScheme(unresolvedResource);
					} else {
						unresolvedResource = requestWithoutMatchResource;
						elements = EMPTY_ELEMENTS;
					}
				} else {
					unresolvedResource = request;
					elements = EMPTY_ELEMENTS;
				}

				/** @type {ResolveContext} */
				const resolveContext = {
					fileDependencies,
					missingDependencies,
					contextDependencies
				};

				/** @type {ResourceDataWithData} */
				let resourceData;

				/** @type {undefined | LoaderItem[]} */
				let loaders;

				const continueCallback = needCalls(2, (err) => {
					if (err) return callback(err);

					// translate option idents
					try {
						for (const item of /** @type {LoaderItem[]} */ (loaders)) {
							if (typeof item.options === "string" && item.options[0] === "?") {
								const ident = item.options.slice(1);
								if (ident === "[[missing ident]]") {
									throw new Error(
										"No ident is provided by referenced loader. " +
											"When using a function for Rule.use in config you need to " +
											"provide an 'ident' property for referenced loader options."
									);
								}
								item.options = this.ruleSet.references.get(ident);
								if (item.options === undefined) {
									throw new Error(
										"Invalid ident is provided by referenced loader"
									);
								}
								item.ident = ident;
							}
						}
					} catch (identErr) {
						return callback(/** @type {Error} */ (identErr));
					}

					if (!resourceData) {
						// ignored
						return callback(null, dependencies[0].createIgnoredModule(context));
					}

					const userRequest =
						(matchResourceData !== undefined
							? `${matchResourceData.resource}!=!`
							: "") +
						stringifyLoadersAndResource(
							/** @type {LoaderItem[]} */ (loaders),
							resourceData.resource
						);

					/** @type {ModuleSettings} */
					const settings = {};
					/** @type {LoaderItem[]} */
					const useLoadersPost = [];
					/** @type {LoaderItem[]} */
					const useLoaders = [];
					/** @type {LoaderItem[]} */
					const useLoadersPre = [];

					// handle .webpack[] suffix
					/** @type {string} */
					let resource;
					/** @type {RegExpExecArray | null} */
					let match;
					if (
						matchResourceData &&
						typeof (resource = matchResourceData.resource) === "string" &&
						(match = /\.webpack\[([^\]]+)\]$/.exec(resource))
					) {
						settings.type = match[1];
						matchResourceData.resource = matchResourceData.resource.slice(
							0,
							-settings.type.length - 10
						);
					} else {
						settings.type = JAVASCRIPT_MODULE_TYPE_AUTO;
						const resourceDataForRules = matchResourceData || resourceData;

						const result = this.ruleSet.exec({
							resource: resourceDataForRules.path,
							realResource: resourceData.path,
							resourceQuery: resourceDataForRules.query,
							resourceFragment: resourceDataForRules.fragment,
							scheme,
							phase,
							attributes,
							mimetype: matchResourceData
								? ""
								: resourceData.data.mimetype || "",
							dependency: dependencyType,
							descriptionData: matchResourceData
								? undefined
								: resourceData.data.descriptionFileData,
							descriptionRelativePath: matchResourceData
								? undefined
								: resourceData.data.relativePath,
							issuer: contextInfo.issuer,
							compiler: contextInfo.compiler,
							issuerLayer: contextInfo.issuerLayer || ""
						});
						for (const r of result) {
							// https://github.com/webpack/webpack/issues/16466
							// if a request exists PrePostAutoLoaders, should disable modifying Rule.type
							if (r.type === "type" && noPrePostAutoLoaders) {
								continue;
							}
							if (r.type === "use") {
								if (!noAutoLoaders && !noPrePostAutoLoaders) {
									useLoaders.push(r.value);
								}
							} else if (r.type === "use-post") {
								if (!noPrePostAutoLoaders) {
									useLoadersPost.push(r.value);
								}
							} else if (r.type === "use-pre") {
								if (!noPreAutoLoaders && !noPrePostAutoLoaders) {
									useLoadersPre.push(r.value);
								}
							} else if (
								typeof r.value === "object" &&
								r.value !== null &&
								typeof settings[
									/** @type {keyof ModuleSettings} */
									(r.type)
								] === "object" &&
								settings[/** @type {keyof ModuleSettings} */ (r.type)] !== null
							) {
								const type = /** @type {keyof ModuleSettings} */ (r.type);
								settings[type] = cachedCleverMerge(settings[type], r.value);
							} else {
								const type = /** @type {keyof ModuleSettings} */ (r.type);
								settings[type] = r.value;
							}
						}
					}

					/** @type {undefined | LoaderItem[]} */
					let postLoaders;
					/** @type {undefined | LoaderItem[]} */
					let normalLoaders;
					/** @type {undefined | LoaderItem[]} */
					let preLoaders;

					const continueCallback = needCalls(3, (err) => {
						if (err) {
							return callback(err);
						}
						const allLoaders = /** @type {LoaderItem[]} */ (postLoaders);
						if (matchResourceData === undefined) {
							for (const loader of /** @type {LoaderItem[]} */ (loaders)) {
								allLoaders.push(loader);
							}
							for (const loader of /** @type {LoaderItem[]} */ (
								normalLoaders
							)) {
								allLoaders.push(loader);
							}
						} else {
							for (const loader of /** @type {LoaderItem[]} */ (
								normalLoaders
							)) {
								allLoaders.push(loader);
							}
							for (const loader of /** @type {LoaderItem[]} */ (loaders)) {
								allLoaders.push(loader);
							}
						}
						for (const loader of /** @type {LoaderItem[]} */ (preLoaders)) {
							allLoaders.push(loader);
						}
						const type = /** @type {NormalModuleTypes} */ (settings.type);
						const resolveOptions = settings.resolve;
						const layer = settings.layer;

						const applyCreateData = () => {
							try {
								Object.assign(data.createData, {
									layer:
										layer === undefined
											? contextInfo.issuerLayer || null
											: layer,
									request: stringifyLoadersAndResource(
										allLoaders,
										resourceData.resource
									),
									userRequest,
									rawRequest: request,
									loaders: allLoaders,
									resource: resourceData.resource,
									context:
										resourceData.context || getContext(resourceData.resource),
									matchResource: matchResourceData
										? matchResourceData.resource
										: undefined,
									resourceResolveData: resourceData.data,
									settings,
									type,
									parser: this.getParser(type, settings.parser),
									parserOptions: settings.parser,
									generator: this.getGenerator(type, settings.generator),
									generatorOptions: settings.generator,
									resolveOptions,
									extractSourceMap: settings.extractSourceMap || false
								});
							} catch (createDataErr) {
								return callback(/** @type {Error} */ (createDataErr));
							}
							callback();
						};

						this._prepareModuleType(type, (err) => {
							if (err) return callback(err);
							applyCreateData();
						});
					});
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoadersPost,
						loaderResolver,
						resolveContext,
						(err, result) => {
							postLoaders = result;
							continueCallback(err);
						}
					);
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoaders,
						loaderResolver,
						resolveContext,
						(err, result) => {
							normalLoaders = result;
							continueCallback(err);
						}
					);
					this.resolveRequestArray(
						contextInfo,
						this.context,
						useLoadersPre,
						loaderResolver,
						resolveContext,
						(err, result) => {
							preLoaders = result;
							continueCallback(err);
						}
					);
				});

				this.resolveRequestArray(
					contextInfo,
					contextScheme ? this.context : context,
					/** @type {LoaderItem[]} */ (elements),
					loaderResolver,
					resolveContext,
					(err, result) => {
						if (err) return continueCallback(err);
						loaders = result;
						continueCallback();
					}
				);

				/**
				 * Processes the provided string.
				 * @param {string} context context
				 */
				const defaultResolve = (context) => {
					if (/^(?:$|\?)/.test(unresolvedResource)) {
						resourceData = {
							...cacheParseResource(unresolvedResource),
							resource: unresolvedResource,
							data: {}
						};
						continueCallback();
					}

					// resource without scheme and with path
					else {
						const normalResolver = this.getResolver(
							"normal",
							dependencyType
								? cachedSetProperty(
										resolveOptions || EMPTY_RESOLVE_OPTIONS,
										"dependencyType",
										dependencyType
									)
								: resolveOptions
						);
						this.resolveResource(
							contextInfo,
							context,
							escapeHashInPathRequest(unresolvedResource),
							normalResolver,
							resolveContext,
							(err, _resolvedResource, resolvedResourceResolveData) => {
								if (err) return continueCallback(err);
								if (_resolvedResource !== false) {
									const resolvedResource =
										/** @type {string} */
										(_resolvedResource);
									resourceData = {
										...cacheParseResource(resolvedResource),
										resource: resolvedResource,
										data:
											/** @type {ResolveRequest} */
											(resolvedResourceResolveData)
									};
								}
								continueCallback();
							}
						);
					}
				};

				// resource with scheme
				if (scheme) {
					resourceData = {
						resource: unresolvedResource,
						data: {},
						path: undefined,
						query: undefined,
						fragment: undefined,
						context: undefined
					};
					this.hooks.resolveForScheme
						.for(scheme)
						.callAsync(resourceData, data, (err) => {
							if (err) return continueCallback(err);
							continueCallback();
						});
				}

				// resource within scheme
				else if (contextScheme) {
					resourceData = {
						resource: unresolvedResource,
						data: {},
						path: undefined,
						query: undefined,
						fragment: undefined,
						context: undefined
					};
					this.hooks.resolveInScheme
						.for(contextScheme)
						.callAsync(resourceData, data, (err, handled) => {
							if (err) return continueCallback(err);
							if (!handled) return defaultResolve(this.context);
							continueCallback();
						});
				}

				// resource without scheme and without path
				else {
					defaultResolve(context);
				}
			}
		);
	}

	cleanupForCache() {
		for (const module of this._restoredUnsafeCacheEntries) {
			ChunkGraph.clearChunkGraphForModule(module);
			ModuleGraph.clearModuleGraphForModule(module);
			module.cleanupForCache();
		}
	}

	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dependencies = /** @type {ModuleDependency[]} */ (data.dependencies);
		const context = data.context || this.context;
		const resolveOptions = data.resolveOptions || EMPTY_RESOLVE_OPTIONS;
		const dependency = dependencies[0];
		const request = dependency.request;
		const attributes =
			/** @type {ModuleDependency & { attributes: ImportAttributes }} */
			(dependency).attributes;
		const phase =
			typeof (
				/** @type {ModuleDependency & { phase?: ImportPhaseType }} */
				(dependency).phase
			) === "number"
				? ImportPhaseUtils.stringify(
						/** @type {ModuleDependency & { phase?: ImportPhaseType }} */
						(dependency).phase
					)
				: "evaluation";
		const dependencyType = dependency.category || "";
		const contextInfo = data.contextInfo;
		/** @type {FileSystemDependencies} */
		const fileDependencies = new LazySet();
		/** @type {FileSystemDependencies} */
		const missingDependencies = new LazySet();
		/** @type {FileSystemDependencies} */
		const contextDependencies = new LazySet();
		/** @type {ResolveData} */
		const resolveData = {
			contextInfo,
			resolveOptions,
			context,
			request,
			phase,
			attributes,
			dependencies,
			dependencyType,
			fileDependencies,
			missingDependencies,
			contextDependencies,
			createData: {},
			cacheable: true
		};
		this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
			if (err) {
				return callback(err, {
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: false
				});
			}

			// Ignored
			if (result === false) {
				/** @type {ModuleFactoryResult} * */
				const factoryResult = {
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: resolveData.cacheable
				};

				if (resolveData.ignoredModule) {
					factoryResult.module = resolveData.ignoredModule;
				}

				return callback(null, factoryResult);
			}

			if (typeof result === "object") {
				throw new Error(
					deprecationChangedHookMessage(
						"beforeResolve",
						this.hooks.beforeResolve
					)
				);
			}

			this.hooks.factorize.callAsync(resolveData, (err, module) => {
				if (err) {
					return callback(err, {
						fileDependencies,
						missingDependencies,
						contextDependencies,
						cacheable: false
					});
				}

				/** @type {ModuleFactoryResult} * */
				const factoryResult = {
					module,
					fileDependencies,
					missingDependencies,
					contextDependencies,
					cacheable: resolveData.cacheable
				};

				callback(null, factoryResult);
			});
		});
	}

	/**
	 * Processes the provided context info.
	 * @param {ModuleFactoryCreateDataContextInfo} contextInfo context info
	 * @param {string} context context
	 * @param {string} unresolvedResource unresolved resource
	 * @param {ResolverWithOptions} resolver resolver
	 * @param {ResolveContext} resolveContext resolver context
	 * @param {(err: null | Error, res?: string | false, req?: ResolveRequest) => void} callback callback
	 */
	resolveResource(
		contextInfo,
		context,
		unresolvedResource,
		resolver,
		resolveContext,
		callback
	) {
		resolver.resolve(
			contextInfo,
			context,
			unresolvedResource,
			resolveContext,
			(err, resolvedResource, resolvedResourceResolveData) => {
				if (err) {
					return this._resolveResourceErrorHints(
						err,
						contextInfo,
						context,
						unresolvedResource,
						resolver,
						resolveContext,
						(err2, hints) => {
							if (err2) {
								err.message += `
A fatal error happened during resolving additional hints for this error: ${err2.message}`;
								err.stack += `

A fatal error happened during resolving additional hints for this error:
${err2.stack}`;
								return callback(err);
							}
							if (hints && hints.length > 0) {
								err.message += `
${hints.join("\n\n")}`;
							}

							// Check if the extension is missing a leading dot (e.g. "js" instead of ".js")
							let appendResolveExtensionsHint = false;
							const specifiedExtensions = [...resolver.options.extensions];
							const expectedExtensions = specifiedExtensions.map(
								(extension) => {
									if (LEADING_DOT_EXTENSION_REGEX.test(extension)) {
										appendResolveExtensionsHint = true;
										return `.${extension}`;
									}
									return extension;
								}
							);
							if (appendResolveExtensionsHint) {
								err.message += `\nDid you miss the leading dot in 'resolve.extensions'? Did you mean '${JSON.stringify(
									expectedExtensions
								)}' instead of '${JSON.stringify(specifiedExtensions)}'?`;
							}

							callback(err);
						}
					);
				}
				callback(err, resolvedResource, resolvedResourceResolveData);
			}
		);
	}

	/**
	 * Resolve resource error hints.
	 * @param {Error} error error
	 * @param {ModuleFactoryCreateDataContextInfo} contextInfo context info
	 * @param {string} context context
	 * @param {string} unresolvedResource unresolved resource
	 * @param {ResolverWithOptions} resolver resolver
	 * @param {ResolveContext} resolveContext resolver context
	 * @param {Callback<string[]>} callback callback
	 * @private
	 */
	_resolveResourceErrorHints(
		error,
		contextInfo,
		context,
		unresolvedResource,
		resolver,
		resolveContext,
		callback
	) {
		/**
		 * Names the entry of the request's directory it comes closest to, for
		 * requests that failed over a typo or the casing of a file name. A module
		 * request is looked up in the module directories, so a wrongly cased
		 * package name is named too, and a directory the request spells out is
		 * itself matched by casing.
		 * @param {(hint?: string) => void} callback callback
		 * @returns {void}
		 */
		const suggestClosestEntry = (callback) => {
			const {
				path: requestPath,
				query,
				fragment
			} = parseResource(unresolvedResource);

			/**
			 * Absolute paths the resolver would have tried for a request, in the
			 * order it tries them.
			 * @param {string} request a request
			 * @returns {string[]} absolute paths
			 */
			const lookupPaths = (request) => {
				if (ABSOLUTE_PATH_REGEXP.test(request)) {
					const paths = [request];
					const firstChar = request.charCodeAt(0);
					// A request rooted at '/' is looked up under 'resolve.roots' as well
					if (firstChar === 47 /* "/" */ || firstChar === 92 /* "\\" */) {
						for (const root of resolver.options.roots) {
							paths.push(join(this.fs, root, request.slice(1)));
						}
					}
					return paths;
				}
				if (RELATIVE_REQUEST_REGEXP.test(request)) {
					return [join(this.fs, context, request)];
				}
				/** @type {string[]} */
				const paths = [];
				// 'preferRelative' lets a module request resolve next to its origin too
				if (resolver.options.preferRelative) {
					paths.push(join(this.fs, context, request));
				}
				for (const directory of moduleLookupDirectories(
					this.fs,
					context,
					resolver.options.modules
				)) {
					paths.push(join(this.fs, directory, request));
				}
				return paths;
			};

			const absoluteRequests = lookupPaths(requestPath);
			// Each path costs a readdir, a casing walk and a resolve, so a large
			// alias map must not turn one failed request into unbounded work
			for (const aliased of aliasedRequests(
				requestPath,
				resolver.options.alias
			)) {
				if (absoluteRequests.length >= MAX_SUGGESTION_CANDIDATES) break;
				for (const path of lookupPaths(aliased)) absoluteRequests.push(path);
			}
			if (absoluteRequests.length > MAX_SUGGESTION_CANDIDATES) {
				absoluteRequests.length = MAX_SUGGESTION_CANDIDATES;
			}

			/**
			 * @param {string} prefix the request without its last segment, with the real casing
			 * @param {string} requestedName the last segment of the request
			 * @param {string[]} entries entries of the directory it was looked up in
			 * @param {boolean} directoryCorrected whether the casing of `prefix` had to be corrected
			 * @param {() => void} giveUp continues the search when nothing is close enough
			 * @returns {void}
			 */
			const suggest = (
				prefix,
				requestedName,
				entries,
				directoryCorrected,
				giveUp
			) => {
				const closest =
					directoryCorrected && entries.includes(requestedName)
						? { entry: requestedName, distance: 0 }
						: findClosestEntry(
								requestedName,
								entries,
								resolver.options.extensions
							);
				if (!closest) return giveUp();
				const existing = prefix + closest.entry;
				// The query and fragment select what to do with the file, so they
				// belong in a request the user is meant to copy — but not in a
				// sentence about what is on disk
				const suggestion = existing + query + fragment;
				const characters =
					closest.distance === 1
						? "1 character"
						: `${closest.distance} characters`;
				// A corrected directory is not part of `entry`, so the whole path has
				// to be named for the sentence to account for every difference
				const difference =
					closest.distance === 0
						? directoryCorrected
							? `'${existing}' exists and differs from the request only in casing. Case-sensitive filesystems (most Linux ones) fail to resolve it, even when the same build succeeds on a case-insensitive one.`
							: `'${closest.entry}' exists in that directory and differs from the request only in casing. Case-sensitive filesystems (most Linux ones) fail to resolve it, even when the same build succeeds on a case-insensitive one.`
						: directoryCorrected
							? `'${prefix}' differs from the request only in casing, and '${closest.entry}' is the closest name in it. It differs from the request by ${characters}, ignoring case and file extension.`
							: `'${closest.entry}' is the closest name in that directory. It differs from the request by ${characters}, ignoring case and file extension.`;
				// Offering a request that fails too would only be a second error, so the
				// resolver has the last word. That keeps the hint aligned with every
				// resolve option, not just the ones consulted to find the entry.
				resolver.resolve(
					contextInfo,
					context,
					suggestion,
					resolveContext,
					(suggestionError, resolved) => {
						if (suggestionError || !resolved) return giveUp();
						callback(`Did you mean '${suggestion}'?
${difference}`);
					}
				);
			};

			/**
			 * @param {number} index index into `absoluteRequests`
			 * @returns {void}
			 */
			const next = (index) => {
				if (index >= absoluteRequests.length) return callback();
				const absoluteRequest = absoluteRequests[index];
				const directory = dirname(this.fs, absoluteRequest);
				const requestedName = relative(this.fs, directory, absoluteRequest);
				// A request ending in '.' or '..' names a directory, not an entry in one.
				if (!requestPath.endsWith(requestedName)) return next(index + 1);
				const prefix = requestPath.slice(
					0,
					requestPath.length - requestedName.length
				);
				this.fs.readdir(directory, (err, entries) => {
					if (!err && entries) {
						return suggest(
							prefix,
							requestedName,
							/** @type {string[]} */ (entries),
							false,
							() => next(index + 1)
						);
					}
					// The directory is missing, so only a directory the request spells
					// out itself can be the wrongly cased one
					if (!namesDirectories(prefix)) return next(index + 1);
					findCaseMismatch(this.fs, directory, (mismatch) => {
						if (!mismatch) return next(index + 1);
						const fixedPrefix = applyCaseCorrections(
							prefix,
							mismatch.corrections
						);
						if (fixedPrefix === undefined) return next(index + 1);
						this.fs.readdir(mismatch.path, (realError, realEntries) => {
							if (realError || !realEntries) return next(index + 1);
							suggest(
								fixedPrefix,
								requestedName,
								/** @type {string[]} */ (realEntries),
								true,
								() => next(index + 1)
							);
						});
					});
				});
			};
			next(0);
		};

		asyncLib.parallel(
			[
				(callback) => {
					if (!resolver.options.fullySpecified) return callback();
					resolver
						.withOptions({
							fullySpecified: false
						})
						.resolve(
							contextInfo,
							context,
							unresolvedResource,
							resolveContext,
							(err, resolvedResource) => {
								if (!err && resolvedResource) {
									const resource = parseResource(resolvedResource).path.replace(
										/^.*[\\/]/,
										""
									);
									return callback(
										null,
										`Did you mean '${resource}'?
BREAKING CHANGE: The request '${unresolvedResource}' failed to resolve only because it was resolved as fully specified
(probably because the origin is strict EcmaScript Module, e. g. a module with javascript mimetype, a '*.mjs' file, or a '*.js' file where the package.json contains '"type": "module"').
The extension in the request is mandatory for it to be fully specified.
Add the extension to the request.`
									);
								}
								callback();
							}
						);
				},
				(callback) => {
					if (!resolver.options.enforceExtension) return callback();
					resolver
						.withOptions({
							enforceExtension: false,
							extensions: []
						})
						.resolve(
							contextInfo,
							context,
							unresolvedResource,
							resolveContext,
							(err, resolvedResource) => {
								if (!err && resolvedResource) {
									let hint = "";
									const match = /\.[^.]+(?:\?|$)/.exec(unresolvedResource);
									if (match) {
										const fixedRequest = unresolvedResource.replace(
											/(\.[^.]+)(\?|$)/,
											"$2"
										);
										hint = resolver.options.extensions.has(match[1])
											? `Did you mean '${fixedRequest}'?`
											: `Did you mean '${fixedRequest}'? Also note that '${match[1]}' is not in 'resolve.extensions' yet and need to be added for this to work?`;
									} else {
										hint =
											"Did you mean to omit the extension or to remove 'resolve.enforceExtension'?";
									}
									return callback(
										null,
										`The request '${unresolvedResource}' failed to resolve only because 'resolve.enforceExtension' was specified.
${hint}
Including the extension in the request is no longer possible. Did you mean to enforce including the extension in requests with 'resolve.extensions: []' instead?`
									);
								}
								callback();
							}
						);
				},
				(callback) => {
					if (
						/^\.\.?\//.test(unresolvedResource) ||
						resolver.options.preferRelative
					) {
						return callback();
					}
					resolver.resolve(
						contextInfo,
						context,
						`./${unresolvedResource}`,
						resolveContext,
						(err, resolvedResource) => {
							if (err || !resolvedResource) return callback();
							const moduleDirectories = resolver.options.modules
								.map((m) => (Array.isArray(m) ? m.join(", ") : m))
								.join(", ");
							callback(
								null,
								`Did you mean './${unresolvedResource}'?
Requests that should resolve in the current directory need to start with './'.
Requests that start with a name are treated as module requests and resolve within module directories (${moduleDirectories}).
If changing the source code is not an option there is also a resolve options called 'preferRelative' which tries to resolve these kind of requests in the current directory too.`
							);
						}
					);
				}
			],
			(err, hints) => {
				if (err) return callback(err);
				const resolveHints = /** @type {string[]} */ (hints).filter(Boolean);
				// The hints above explain why an existing file was rejected and name it
				// themselves, so only look for a similar name when none of them applied.
				if (resolveHints.length > 0) return callback(null, resolveHints);
				suggestClosestEntry((hint) => callback(null, hint ? [hint] : []));
			}
		);
	}

	/**
	 * Resolves request array.
	 * @param {ModuleFactoryCreateDataContextInfo} contextInfo context info
	 * @param {string} context context
	 * @param {LoaderItem[]} array array
	 * @param {ResolverWithOptions} resolver resolver
	 * @param {ResolveContext} resolveContext resolve context
	 * @param {Callback<LoaderItem[]>} callback callback
	 * @returns {void} result
	 */
	resolveRequestArray(
		contextInfo,
		context,
		array,
		resolver,
		resolveContext,
		callback
	) {
		// LoaderItem
		if (array.length === 0) return callback(null, array);
		asyncLib.map(
			array,
			/**
			 * Handles the callback logic for this hook.
			 * @param {LoaderItem} item item
			 * @param {Callback<LoaderItem>} callback callback
			 * @returns {void}
			 */
			(item, callback) => {
				// Loaders resolve identically for a given (context, request), so memoize
				// the result and the resolve's dependencies to skip repeated resolves.
				const cacheKey = `${context}\n${item.loader}`;
				const cached = this._loaderResolveCache.get(cacheKey);
				if (cached !== undefined) {
					replayResolveDependencies(resolveContext, cached);
					return callback(null, {
						loader: cached.loader,
						type: cached.type,
						options:
							item.options === undefined
								? cached.query
									? cached.query.slice(1)
									: undefined
								: item.options,
						ident: item.options === undefined ? undefined : item.ident
					});
				}
				// Capture this resolve's dependencies in dedicated sets so a future hit
				// can replay them; also feed them back into the caller's resolveContext.
				const captureContext = {
					...resolveContext,
					fileDependencies: new LazySet(),
					contextDependencies: new LazySet(),
					missingDependencies: new LazySet()
				};
				resolver.resolve(
					contextInfo,
					context,
					item.loader,
					captureContext,
					(err, result, resolveRequest) => {
						// Merge the captured dependencies back so a failed or successful
						// resolve records them for watch invalidation just like before.
						replayResolveDependencies(resolveContext, captureContext);
						if (
							err &&
							/^[^/]*$/.test(item.loader) &&
							!item.loader.endsWith("-loader")
						) {
							return resolver.resolve(
								contextInfo,
								context,
								`${item.loader}-loader`,
								resolveContext,
								(err2) => {
									if (!err2) {
										err.message =
											`${err.message}\n` +
											"BREAKING CHANGE: It's no longer allowed to omit the '-loader' suffix when using loaders.\n" +
											`                 You need to specify '${item.loader}-loader' instead of '${item.loader}',\n` +
											"                 see https://webpack.js.org/migrate/3/#automatic-loader-module-name-extension-removed";
									}
									callback(err);
								}
							);
						}
						if (err) return callback(err);

						const parsedResult = this._parseResourceWithoutFragment(
							/** @type {string} */
							(result)
						);

						const type = /\.mjs$/i.test(parsedResult.path)
							? "module"
							: /\.cjs$/i.test(parsedResult.path)
								? "commonjs"
								: /** @type {ResolveRequest} */
									(resolveRequest).descriptionFileData === undefined
									? undefined
									: /** @type {string} */
										(
											/** @type {ResolveRequest} */
											(resolveRequest).descriptionFileData.type
										);

						this._loaderResolveCache.set(cacheKey, {
							loader: parsedResult.path,
							query: parsedResult.query,
							type,
							fileDependencies: captureContext.fileDependencies,
							contextDependencies: captureContext.contextDependencies,
							missingDependencies: captureContext.missingDependencies
						});

						/** @type {LoaderItem} */
						const resolved = {
							loader: parsedResult.path,
							type,
							options:
								item.options === undefined
									? parsedResult.query
										? parsedResult.query.slice(1)
										: undefined
									: item.options,
							ident: item.options === undefined ? undefined : item.ident
						};

						return callback(null, resolved);
					}
				);
			},
			(err, value) => {
				callback(
					/** @type {Error | null} */ (err),
					/** @type {(LoaderItem)[]} */ (value)
				);
			}
		);
	}

	/**
	 * Runs `prepareModuleType` for a type once, so a plugin can load what its
	 * synchronous `createParser`/`createGenerator` tap needs. Calls back
	 * synchronously for a type nothing taps or that is already prepared.
	 * @param {string} type module type
	 * @param {Callback<void>} callback signals the type is ready
	 * @returns {void}
	 */
	_prepareModuleType(type, callback) {
		const state = this._moduleTypePreparation.get(type);
		if (state === true) return callback(null);
		if (state !== undefined) {
			state.push(callback);
			return;
		}
		const hook = this.hooks.prepareModuleType.get(type);
		if (hook === undefined) {
			this._moduleTypePreparation.set(type, true);
			return callback(null);
		}
		/** @type {Callback<void>[]} */
		const waiting = [];
		this._moduleTypePreparation.set(type, waiting);
		hook.callAsync((err) => {
			// a failed preparation must not be remembered as done
			if (err) this._moduleTypePreparation.delete(type);
			else this._moduleTypePreparation.set(type, true);
			// every queued factorize must be resumed, so one callback throwing
			// cannot starve the rest — the first throw is rethrown afterwards
			waiting.unshift(callback);
			const error = err || null;
			/** @type {Error | undefined} */
			let thrown;
			for (const waitingCallback of waiting) {
				try {
					waitingCallback(error);
				} catch (err_) {
					if (thrown === undefined) {
						thrown = /** @type {Error} */ (err_);
					}
				}
			}
			if (thrown !== undefined) throw thrown;
		});
	}

	/**
	 * Returns parser.
	 * @template {string} T
	 * @param {T} type type
	 * @param {ParserOptions} parserOptions parser options
	 * @returns {ParserByType[T]} parser
	 */
	getParser(type, parserOptions = EMPTY_PARSER_OPTIONS) {
		let cache = this.parserCache.get(type);

		if (cache === undefined) {
			cache = new WeakMap();
			this.parserCache.set(type, cache);
		}

		let parser = cache.get(parserOptions);

		if (parser === undefined) {
			parser = this.createParser(type, parserOptions);
			cache.set(parserOptions, parser);
		}

		return /** @type {ParserByType[T]} */ (parser);
	}

	/**
	 * Creates a parser from the provided type.
	 * @template {string} T
	 * @param {T} type type
	 * @param {ParserOptions} parserOptions parser options
	 * @returns {ParserByType[T]} parser
	 */
	createParser(type, parserOptions = {}) {
		parserOptions = mergeGlobalOptions(
			this._globalParserOptions,
			type,
			parserOptions
		);
		const parser = this.hooks.createParser.for(type).call(parserOptions);
		if (!parser) {
			throw new Error(`No parser registered for ${type}`);
		}
		this.hooks.parser.for(type).call(parser, parserOptions);
		return /** @type {ParserByType[T]} */ (parser);
	}

	/**
	 * Returns generator.
	 * @template {string} T
	 * @param {T} type type of generator
	 * @param {GeneratorOptions} generatorOptions generator options
	 * @returns {GeneratorByType[T]} generator
	 */
	getGenerator(type, generatorOptions = EMPTY_GENERATOR_OPTIONS) {
		let cache = this.generatorCache.get(type);

		if (cache === undefined) {
			cache = new WeakMap();
			this.generatorCache.set(type, cache);
		}

		let generator = cache.get(generatorOptions);

		if (generator === undefined) {
			generator = this.createGenerator(type, generatorOptions);
			cache.set(generatorOptions, generator);
		}

		return /** @type {GeneratorByType[T]} */ (generator);
	}

	/**
	 * Creates a generator.
	 * @template {string} T
	 * @param {T} type type of generator
	 * @param {GeneratorOptions} generatorOptions generator options
	 * @returns {GeneratorByType[T]} generator
	 */
	createGenerator(type, generatorOptions = {}) {
		generatorOptions = mergeGlobalOptions(
			this._globalGeneratorOptions,
			type,
			generatorOptions
		);
		const generator = this.hooks.createGenerator
			.for(type)
			.call(generatorOptions);
		if (!generator) {
			throw new Error(`No generator registered for ${type}`);
		}
		this.hooks.generator.for(type).call(generator, generatorOptions);
		return /** @type {GeneratorByType[T]} */ (generator);
	}

	/**
	 * Returns the resolver.
	 * @param {Parameters<ResolverFactory["get"]>[0]} type type of resolver
	 * @param {Parameters<ResolverFactory["get"]>[1]=} resolveOptions options
	 * @returns {ReturnType<ResolverFactory["get"]>} the resolver
	 */
	getResolver(type, resolveOptions) {
		return this.resolverFactory.get(type, resolveOptions);
	}
}

module.exports = NormalModuleFactory;
