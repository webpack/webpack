/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const mime = require("mime-types");
const { basename, extname, posix } = require("path");
const util = require("util");
const Chunk = require("./Chunk");
const Module = require("./Module");
const { parseResource } = require("./util/identifier");

/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compiler")} Compiler */

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

const prepareId = id => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${match[1]} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_");
};
const internalPath = path =>
	path.replace(/^(\.\.\/)+/, m => "_/".repeat(m.length / 3));

const hashLength = (replacer, handler, assetInfo, hashName) => {
	const fn = (match, arg, input) => {
		let result;
		const length = arg && parseInt(arg, 10);

		if (length && handler) {
			result = handler(length);
		} else {
			const hash = replacer(match, arg, input);

			result = length ? hash.slice(0, length) : hash;
		}
		if (assetInfo) {
			assetInfo.immutable = true;
			if (Array.isArray(assetInfo[hashName])) {
				assetInfo[hashName] = [...assetInfo[hashName], result];
			} else if (assetInfo[hashName]) {
				assetInfo[hashName] = [assetInfo[hashName], result];
			} else {
				assetInfo[hashName] = result;
			}
		}
		return result;
	};

	return fn;
};

const replacer = (value, allowEmpty) => {
	const fn = (match, arg, input) => {
		if (typeof value === "function") {
			value = value();
		}
		if (value === null || value === undefined) {
			if (!allowEmpty) {
				throw new Error(
					`Path variable ${match} not implemented in this context: ${input}`
				);
			}

			return "";
		} else {
			return `${value}`;
		}
	};

	return fn;
};

/**
 * @param {string} input input
 * @param {number} index match index
 * @returns {string} replaced path
 */
const rootReplacer = (input, index) => {
	const subPath = input.slice(index + 6 /* "[root]".length */);
	const normalized = posix.normalize(subPath);

	return input.slice(0, index) + internalPath(normalized);
};

const deprecationCache = new Map();
const deprecatedFunction = (() => () => {})();
const deprecated = (fn, message, code) => {
	let d = deprecationCache.get(message);
	if (d === undefined) {
		d = util.deprecate(deprecatedFunction, message, code);
		deprecationCache.set(message, d);
	}
	return (...args) => {
		d();
		return fn(...args);
	};
};

/**
 * @param {string | function(PathData, AssetInfo=): string} path the raw path
 * @param {PathData} data context data
 * @param {AssetInfo} assetInfo extra info about the asset (will be written to)
 * @returns {string} the interpolated path
 */
const replacePathVariables = (path, data, assetInfo) => {
	const chunkGraph = data.chunkGraph;

	/** @type {Map<string, Function>} */
	const replacements = new Map();

	// Filename context
	//
	// Placeholders
	//
	// for /some/path/file.js?query#fragment:
	// [file] - /some/path/file.js
	// [query] - ?query
	// [fragment] - #fragment
	// [base] - file.js
	// [path] - /some/path/
	// [name] - file
	// [ext] - .js
	if (typeof data.filename === "string") {
		// check that filename is data uri
		let match = data.filename.match(/^data:([^;,]+)/);
		if (match) {
			const ext = mime.extension(match[1]);
			const emptyReplacer = replacer("", true);

			replacements.set("file", emptyReplacer);
			replacements.set("query", emptyReplacer);
			replacements.set("fragment", emptyReplacer);
			replacements.set("path", emptyReplacer);
			replacements.set("base", emptyReplacer);
			replacements.set("name", emptyReplacer);
			replacements.set("ext", replacer(ext ? `.${ext}` : "", true));
			// Legacy
			replacements.set(
				"filebase",
				deprecated(
					emptyReplacer,
					"[filebase] is now [base]",
					"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
				)
			);
		} else {
			const { path: file, query, fragment } = parseResource(data.filename);

			const ext = extname(file);
			const base = basename(file);
			const name = base.slice(0, base.length - ext.length);
			const path = file.slice(0, file.length - base.length);

			replacements.set("file", replacer(file));
			replacements.set("query", replacer(query, true));
			replacements.set("fragment", replacer(fragment, true));
			replacements.set("path", replacer(path, true));
			replacements.set(
				"internal-path",
				replacer(() => internalPath(path), true)
			);
			replacements.set("base", replacer(base));
			replacements.set("name", replacer(name));
			replacements.set("ext", replacer(ext, true));
			// Legacy
			replacements.set(
				"filebase",
				deprecated(
					replacer(base),
					"[filebase] is now [base]",
					"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
				)
			);
		}
	}

	// Compilation context
	//
	// Placeholders
	//
	// [fullhash] - data.hash (3a4b5c6e7f)
	//
	// Legacy Placeholders
	//
	// [hash] - data.hash (3a4b5c6e7f)
	if (data.hash) {
		const hashReplacer = hashLength(
			replacer(data.hash),
			data.hashWithLength,
			assetInfo,
			"fullhash"
		);

		replacements.set("fullhash", hashReplacer);

		// Legacy
		replacements.set(
			"hash",
			deprecated(
				hashReplacer,
				"[hash] is now [fullhash] (also consider using [chunkhash] or [contenthash], see documentation for details)",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_HASH"
			)
		);
	}

	// Chunk Context
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [name] - chunk.name (app.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256u3zg.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const contentHashType = data.contentHashType;

		const idReplacer = replacer(chunk.id);
		const nameReplacer = replacer(chunk.name || chunk.id);
		const chunkhashReplacer = hashLength(
			replacer(chunk instanceof Chunk ? chunk.renderedHash : chunk.hash),
			"hashWithLength" in chunk ? chunk.hashWithLength : undefined,
			assetInfo,
			"chunkhash"
		);
		const contenthashReplacer = hashLength(
			replacer(
				data.contentHash ||
					(contentHashType &&
						chunk.contentHash &&
						chunk.contentHash[contentHashType])
			),
			data.contentHashWithLength ||
				("contentHashWithLength" in chunk && chunk.contentHashWithLength
					? chunk.contentHashWithLength[contentHashType]
					: undefined),
			assetInfo,
			"contenthash"
		);

		replacements.set("id", idReplacer);
		replacements.set("name", nameReplacer);
		replacements.set("chunkhash", chunkhashReplacer);
		replacements.set("contenthash", contenthashReplacer);
	}

	// Module Context
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [hash] - module.hash (6237543873.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;

		const idReplacer = replacer(() =>
			prepareId(
				module instanceof Module ? chunkGraph.getModuleId(module) : module.id
			)
		);
		const moduleHashReplacer = hashLength(
			replacer(() =>
				module instanceof Module
					? chunkGraph.getRenderedModuleHash(module, data.runtime)
					: module.hash
			),
			"hashWithLength" in module ? module.hashWithLength : undefined,
			assetInfo,
			"modulehash"
		);
		const contentHashReplacer = hashLength(
			replacer(data.contentHash),
			undefined,
			assetInfo,
			"contenthash"
		);

		replacements.set("id", idReplacer);
		replacements.set("modulehash", moduleHashReplacer);
		replacements.set("contenthash", contentHashReplacer);
		replacements.set(
			"hash",
			data.contentHash ? contentHashReplacer : moduleHashReplacer
		);
		// Legacy
		replacements.set(
			"moduleid",
			deprecated(
				idReplacer,
				"[moduleid] is now [id]",
				"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_MODULE_ID"
			)
		);
	}

	// Other things
	if (data.url) {
		replacements.set("url", replacer(data.url));
	}
	if (typeof data.runtime === "string") {
		replacements.set(
			"runtime",
			replacer(() => prepareId(data.runtime))
		);
	} else {
		replacements.set("runtime", replacer("_"));
	}

	if (typeof path === "function") {
		path = path(data, assetInfo);
	}

	path = path.replace(REGEXP, (match, content) => {
		if (content.length + 2 === match.length) {
			const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
			if (!contentMatch) return match;
			const [, kind, arg] = contentMatch;
			const replacer = replacements.get(kind);
			if (replacer !== undefined) {
				return replacer(match, arg, path);
			}
		} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
			return `[${match.slice(2, -2)}]`;
		}
		return match;
	});

	const regexp = /\[root\]/gi;
	const matches = [];
	let match;

	while ((match = regexp.exec(path))) matches.push(match.index);
	if (matches.length) {
		for (let i = matches.length - 1; i >= 0; i--) {
			path = rootReplacer(path, matches[i]);
		}
	}

	return path;
};

const plugin = "TemplatedPathPlugin";

class TemplatedPathPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, compilation => {
			compilation.hooks.assetPath.tap(plugin, replacePathVariables);
		});
	}
}

module.exports = TemplatedPathPlugin;
