/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const Template = require("../Template");
const propertyAccess = require("../util/propertyAccess");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptModulesPlugin").RenderContext} RenderContext */
/** @typedef {import("../util/Hash")} Hash */
/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */

const KEYWORD_REGEX = /^(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|super|switch|static|this|throw|try|true|typeof|var|void|while|with|yield)$/;
const IDENTIFIER_REGEX = /^[\p{L}\p{Nl}$_][\p{L}\p{Nl}$\p{Mn}\p{Mc}\p{Nd}\p{Pc}]*$/iu;

/**
 * Validates the library name by checking for keywords and valid characters
 * @param {string} name name to be validated
 * @returns {boolean} true, when valid
 */
const isNameValid = name => {
	return !KEYWORD_REGEX.test(name) && IDENTIFIER_REGEX.test(name);
};

/**
 * @param {string[]} accessor variable plus properties
 * @param {number} existingLength items of accessor that are existing already
 * @param {boolean=} initLast if the last property should also be initialized to an object
 * @returns {string} code to access the accessor while initializing
 */
const accessWithInit = (accessor, existingLength, initLast = false) => {
	// This generates for [a, b, c, d]:
	// (((a = typeof a === "undefined" ? {} : a).b = a.b || {}).c = a.b.c || {}).d
	const base = accessor[0];
	if (accessor.length === 1 && !initLast) return base;
	let current =
		existingLength > 0
			? base
			: `(${base} = typeof ${base} === "undefined" ? {} : ${base})`;

	// i is the current position in accessor that has been printed
	let i = 1;

	// all properties printed so far (excluding base)
	let propsSoFar;

	// if there is existingLength, print all properties until this position as property access
	if (existingLength > i) {
		propsSoFar = accessor.slice(1, existingLength);
		i = existingLength;
		current += propertyAccess(propsSoFar);
	} else {
		propsSoFar = [];
	}

	// all remaining properties (except the last one when initLast is not set)
	// should be printed as initializer
	const initUntil = initLast ? accessor.length : accessor.length - 1;
	for (; i < initUntil; i++) {
		const prop = accessor[i];
		propsSoFar.push(prop);
		current = `(${current}${propertyAccess([prop])} = ${base}${propertyAccess(
			propsSoFar
		)} || {})`;
	}

	// print the last property as property access if not yet printed
	if (i < accessor.length)
		current = `${current}${propertyAccess([accessor[accessor.length - 1]])}`;

	return current;
};

/**
 * @typedef {Object} AssignLibraryPluginOptions
 * @property {LibraryType} type
 * @property {string[] | "global"} prefix name prefix
 * @property {string | false} declare declare name as variable
 * @property {"error"|"copy"|"assign"} unnamed behavior for unnamed library name
 * @property {"copy"|"assign"=} named behavior for named library name
 */

/**
 * @typedef {Object} AssignLibraryPluginParsed
 * @property {string | string[]} name
 */

const COMMON_LIBRARY_NAME_MESSAGE =
	"Common configuration options that specific library names are 'output.library[.name]', 'entry.xyz.library[.name]', 'ModuleFederationPlugin.name' and 'ModuleFederationPlugin.library[.name]'.";

/**
 * @typedef {AssignLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<AssignLibraryPluginParsed>}
 */
class AssignLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * @param {AssignLibraryPluginOptions} options the plugin options
	 */
	constructor(options) {
		super({
			pluginName: "AssignLibraryPlugin",
			type: options.type
		});
		this.prefix = options.prefix;
		this.declare = options.declare;
		this.unnamed = options.unnamed;
		this.named = options.named || "assign";
	}

	/**
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
	 */
	parseOptions(library) {
		const { name } = library;
		if (this.unnamed === "error") {
			if (typeof name !== "string" && !Array.isArray(name)) {
				throw new Error(
					`Library name must be a string or string array. ${COMMON_LIBRARY_NAME_MESSAGE}`
				);
			}
		} else {
			if (name && typeof name !== "string" && !Array.isArray(name)) {
				throw new Error(
					`Library name must be a string, string array or unset. ${COMMON_LIBRARY_NAME_MESSAGE}`
				);
			}
		}
		return {
			name: /** @type {string|string[]=} */ (name)
		};
	}

	/**
	 * @param {Source} source source
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	render(source, { chunkGraph, moduleGraph, chunk }, { options, compilation }) {
		const prefix =
			this.prefix === "global"
				? [compilation.outputOptions.globalObject]
				: this.prefix;
		const fullName = options.name ? prefix.concat(options.name) : prefix;
		const fullNameResolved = fullName.map(n =>
			compilation.getPath(n, {
				chunk
			})
		);
		const result = new ConcatSource();
		if (this.declare) {
			const base = fullNameResolved[0];
			if (!isNameValid(base)) {
				throw new Error(
					`Library name base (${base}) must be a valid identifier when using a var declaring library type. Either use a valid identifier (e. g. ${Template.toIdentifier(
						base
					)}) or use a different library type (e. g. 'type: "global"', which assign a property on the global scope instead of declaring a variable). ${COMMON_LIBRARY_NAME_MESSAGE}`
				);
			}
			result.add(`${this.declare} ${base};`);
		}
		if (options.name ? this.named === "copy" : this.unnamed === "copy") {
			result.add(
				`(function(e, a) { for(var i in a) e[i] = a[i]; if(a.__esModule) Object.defineProperty(e, "__esModule", { value: true }); }(${accessWithInit(
					fullNameResolved,
					prefix.length,
					true
				)},\n`
			);
			result.add(source);
			result.add("\n))");
		} else {
			result.add(
				`${accessWithInit(fullNameResolved, prefix.length, false)} =\n`
			);
			result.add(source);
		}
		return result;
	}

	/**
	 * @param {Chunk} chunk the chunk
	 * @param {Hash} hash hash
	 * @param {ChunkHashContext} chunkHashContext chunk hash context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	chunkHash(chunk, hash, chunkHashContext, { options, compilation }) {
		hash.update("AssignLibraryPlugin");
		const prefix =
			this.prefix === "global"
				? [compilation.outputOptions.globalObject]
				: this.prefix;
		const fullName = options.name ? prefix.concat(options.name) : prefix;
		const fullNameResolved = fullName.map(n =>
			compilation.getPath(n, {
				chunk
			})
		);
		if (!options.name && this.unnamed === "copy") {
			hash.update("copy");
		}
		if (this.declare) {
			hash.update(this.declare);
		}
		hash.update(fullNameResolved.join("."));
	}
}

module.exports = AssignLibraryPlugin;
